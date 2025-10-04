//
//  AuditorTestButton.swift
//  boringNotch
//
//  Standalone test button for Auditor - no dependencies on other Auditor files
//

import SwiftUI

struct AuditorTestView: View {
    @State private var status = "Ready"
    @State private var isProcessing = false
    @State private var progress = 0
    @State private var phase = ""
    @State private var showFilePicker = false
    
    var body: some View {
        VStack(spacing: 20) {
            Text("🔍 Audit Test")
                .font(.headline)
            
            if isProcessing {
                VStack(spacing: 12) {
                    ProgressView(value: Double(progress) / 100.0)
                        .frame(width: 200)
                    
                    Text(phase)
                        .font(.subheadline)
                    
                    Text("\(progress)%")
                        .font(.caption)
                }
            } else {
                Button("Upload & Test") {
                    showFilePicker = true
                }
                .buttonStyle(.borderedProminent)
            }
            
            Text(status)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(40)
        .fileImporter(
            isPresented: $showFilePicker,
            allowedContentTypes: [.pdf, .commaSeparatedText],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                guard let fileURL = urls.first else { return }
                testCompleteFlow(fileURL: fileURL)
            case .failure(let error):
                status = "Error: \(error.localizedDescription)"
            }
        }
    }
    
    // MARK: - Complete Flow Test
    
    private func testCompleteFlow(fileURL: URL) {
        Task {
            isProcessing = true
            status = "Starting upload..."
            
            do {
                // Step 1: Create upload
                phase = "Creating upload..."
                progress = 10
                
                let createURL = URL(string: "https://auditor-edge.evanhaque1.workers.dev/uploads/create")!
                var createRequest = URLRequest(url: createURL)
                createRequest.httpMethod = "POST"
                createRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
                
                let createBody: [String: Any] = [
                    "filename": fileURL.lastPathComponent,
                    "contentType": "application/pdf",
                    "tenantId": "test_from_app"
                ]
                createRequest.httpBody = try JSONSerialization.data(withJSONObject: createBody)
                
                let (createData, _) = try await URLSession.shared.data(for: createRequest)
                let uploadResponse = try JSONDecoder().decode(UploadResponseSimple.self, from: createData)
                
                status = "Upload created: \(uploadResponse.runId)"
                progress = 20
                
                // Step 2: Upload to R2
                phase = "Uploading to R2..."
                progress = 30
                
                let fileData = try Data(contentsOf: fileURL)
                var r2Request = URLRequest(url: URL(string: uploadResponse.r2PutUrl)!)
                r2Request.httpMethod = "PUT"
                r2Request.setValue("application/pdf", forHTTPHeaderField: "Content-Type")
                r2Request.httpBody = fileData
                
                _ = try await URLSession.shared.data(for: r2Request)
                
                status = "File uploaded to R2"
                progress = 50
                
                // Step 3: Enqueue for processing
                phase = "Queuing for processing..."
                progress = 60
                
                let enqueueURL = URL(string: "https://auditor-edge.evanhaque1.workers.dev/runs/\(uploadResponse.runId)/enqueue")!
                var enqueueRequest = URLRequest(url: enqueueURL)
                enqueueRequest.httpMethod = "POST"
                enqueueRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
                
                let enqueueBody: [String: Any] = ["r2Key": uploadResponse.r2Key]
                enqueueRequest.httpBody = try JSONSerialization.data(withJSONObject: enqueueBody)
                
                _ = try await URLSession.shared.data(for: enqueueRequest)
                
                status = "Queued! Run ID: \(uploadResponse.runId)"
                progress = 70
                
                // Step 4: Connect WebSocket
                phase = "Connecting to real-time updates..."
                progress = 80
                
                await connectWebSocket(runId: uploadResponse.runId)
                
                status = "✅ Complete! Check agent logs to see processing."
                progress = 100
                phase = "Done"
                
                // Reset after 3 seconds
                try await Task.sleep(for: .seconds(3))
                isProcessing = false
                progress = 0
                phase = ""
                status = "Ready for next upload"
                
            } catch {
                status = "❌ Error: \(error.localizedDescription)"
                isProcessing = false
                progress = 0
            }
        }
    }
    
    private func connectWebSocket(runId: String) async {
        // Create WebSocket connection
        guard let url = URL(string: "wss://auditor-edge.evanhaque1.workers.dev/ws/run/\(runId)") else {
            return
        }
        
        let webSocketTask = URLSession.shared.webSocketTask(with: url)
        webSocketTask.resume()
        
        // Listen for one message
        webSocketTask.receive { result in
            switch result {
            case .success(let message):
                if case .string(let text) = message {
                    print("📨 WebSocket message: \(text)")
                }
            case .failure(let error):
                print("WebSocket error: \(error)")
            }
        }
        
        // Close after 2 seconds
        try? await Task.sleep(for: .seconds(2))
        webSocketTask.cancel(with: .goingAway, reason: nil)
    }
}

// Simple response models
struct UploadResponseSimple: Codable {
    let runId: String
    let r2PutUrl: String
    let r2Key: String
}

#Preview {
    AuditorTestView()
}

