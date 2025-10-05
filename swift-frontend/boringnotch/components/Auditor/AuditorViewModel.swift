//
//  AuditorViewModel.swift
//  boringNotch
//
//  View model for Auditor feature
//

import Foundation
import Combine
import SwiftUI

enum UploadState {
    case idle
    case uploading(progress: Double)
    case processing
    case completed
    case failed(Error)
}

class AuditorViewModel: ObservableObject {
    static let shared = AuditorViewModel()
    
    @Published var uploadState: UploadState = .idle
    @Published var currentRun: UploadResponse?
    @Published var findings: [Finding] = []
    @Published var statusMessage: String = "Ready to upload"
    
    private let api = AuditorAPIClient.shared
    private let webSocket = WebSocketManager()
    private var cancellables = Set<AnyCancellable>()
    
    private init() {
        setupWebSocketObservers()
    }
    
    private func setupWebSocketObservers() {
        webSocket.$currentPhase
            .sink { [weak self] phase in
                self?.statusMessage = phase
            }
            .store(in: &cancellables)
        
        webSocket.$isComplete
            .sink { [weak self] isComplete in
                if isComplete {
                    self?.uploadState = .completed
                    self?.statusMessage = "Audit complete!"
                }
            }
            .store(in: &cancellables)
        
        webSocket.$error
            .compactMap { $0 }
            .sink { [weak self] error in
                self?.uploadState = .failed(AuditorError.uploadFailed(error))
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Upload Flow
    
    func uploadFile(_ fileURL: URL, tenantId: String = "default_tenant") async {
        do {
            // Determine content type
            let pathExtension = fileURL.pathExtension.lowercased()
            let contentType: String
            
            switch pathExtension {
            case "pdf":
                contentType = "application/pdf"
            case "csv":
                contentType = "text/csv"
            default:
                throw AuditorError.uploadFailed("Unsupported file type. Only PDF and CSV files are supported.")
            }
            
            // Update state
            await MainActor.run {
                uploadState = .uploading(progress: 0.0)
                statusMessage = "Creating upload..."
            }
            
            // Step 1: Create upload and get signed URL
            let uploadResponse = try await api.createUpload(
                filename: fileURL.lastPathComponent,
                contentType: contentType,
                tenantId: tenantId
            )
            
            await MainActor.run {
                currentRun = uploadResponse
                statusMessage = "Uploading file..."
                uploadState = .uploading(progress: 0.3)
            }
            
            // Step 2: Upload file to R2
            try await api.uploadToR2(
                fileURL: fileURL,
                presignedURL: uploadResponse.r2PutUrl,
                contentType: contentType
            )
            
            await MainActor.run {
                uploadState = .uploading(progress: 0.6)
                statusMessage = "Queuing for processing..."
            }
            
            // Step 3: Enqueue for processing
            try await api.enqueueRun(runId: uploadResponse.runId, r2Key: uploadResponse.r2Key)
            
            await MainActor.run {
                uploadState = .processing
                statusMessage = "Processing started..."
            }
            
            // Step 4: Connect WebSocket for real-time updates
            await MainActor.run {
                webSocket.connect(to: uploadResponse.runId)
            }
            
            // Step 5: Poll for completion (optional, WebSocket is primary)
            await pollForCompletion(runId: uploadResponse.runId)
            
        } catch {
            await MainActor.run {
                uploadState = .failed(error)
                statusMessage = "Upload failed: \(error.localizedDescription)"
            }
        }
    }
    
    private func pollForCompletion(runId: String) async {
        // Poll status every 5 seconds as backup to WebSocket
        for _ in 0..<60 { // Max 5 minutes
            try? await Task.sleep(for: .seconds(5))
            
            do {
                let status = try await api.getRunStatus(runId: runId)
                
                await MainActor.run {
                    if status.status == "done" {
                        uploadState = .completed
                        statusMessage = "Processing complete!"
                        webSocket.disconnect()
                        return
                    } else if status.status == "error" {
                        uploadState = .failed(AuditorError.uploadFailed("Processing error"))
                        webSocket.disconnect()
                        return
                    }
                }
            } catch {
                print("Status poll error: \(error)")
            }
        }
    }
    
    // MARK: - Report
    
    func openReport() async {
        guard let runId = currentRun?.runId else {
            print("No run ID available")
            return
        }
        
        do {
            let reportResponse = try await api.getReportUrl(runId: runId)
            
            // Open the report URL in the default browser
            if let url = URL(string: reportResponse.reportUrl) {
                await MainActor.run {
                    NSWorkspace.shared.open(url)
                }
            }
        } catch {
            print("Failed to get report URL: \(error)")
            await MainActor.run {
                statusMessage = "Failed to open report: \(error.localizedDescription)"
            }
        }
    }
    
    // MARK: - Reset
    
    func reset() {
        uploadState = .idle
        currentRun = nil
        findings = []
        statusMessage = "Ready to upload"
        webSocket.disconnect()
    }
}

