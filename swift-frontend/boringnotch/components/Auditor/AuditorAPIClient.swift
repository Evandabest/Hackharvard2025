//
//  AuditorAPIClient.swift
//  boringNotch
//
//  API client for Auditor Edge Worker
//

import Foundation
import Combine

// MARK: - Configuration

struct AuditorConfig {
    static let baseURL = "https://auditor-edge.evanhaque1.workers.dev"
    static let jwtSecret = "cyZwlCFe8WIwvip6Lf5SMcb1eIYh7nqz9WUryMa5CtM" // For server auth if needed
}

// MARK: - Models

struct UploadResponse: Codable {
    let runId: String
    let r2PutUrl: String
    let r2Key: String
}

struct RunStatus: Codable {
    let runId: String
    let tenantId: String
    let status: String
    let createdAt: String?
    let summary: String?
    let realtime: RealtimeState?
}

struct RealtimeState: Codable {
    let phase: String
    let percent: Int
    let lastMessage: String
    let lastUpdated: Double
}

struct Finding: Codable, Identifiable {
    let id: String
    let runId: String
    let code: String
    let severity: String
    let title: String
    let detail: String?
    let createdAt: String?
}

struct ReportUrlResponse: Codable {
    let reportUrl: String
    let reportKey: String
}

enum AuditorError: LocalizedError {
    case invalidURL
    case invalidResponse
    case uploadFailed(String)
    case networkError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .uploadFailed(let message):
            return "Upload failed: \(message)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

// MARK: - API Client

class AuditorAPIClient: ObservableObject {
    static let shared = AuditorAPIClient()
    
    private let baseURL = AuditorConfig.baseURL
    private let session: URLSession
    
    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - Upload Creation
    
    func createUpload(filename: String, contentType: String, tenantId: String) async throws -> UploadResponse {
        guard let url = URL(string: "\(baseURL)/uploads/create") else {
            throw AuditorError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "filename": filename,
            "contentType": contentType,
            "tenantId": tenantId
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw AuditorError.invalidResponse
        }
        
        return try JSONDecoder().decode(UploadResponse.self, from: data)
    }
    
    // MARK: - File Upload to R2
    
    func uploadToR2(fileURL: URL, presignedURL: String, contentType: String) async throws {
        guard let url = URL(string: presignedURL) else {
            throw AuditorError.invalidURL
        }
        
        let fileData = try Data(contentsOf: fileURL)
        
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        request.setValue("\(fileData.count)", forHTTPHeaderField: "Content-Length")
        request.httpBody = fileData
        
        let (_, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw AuditorError.uploadFailed("Failed to upload to R2")
        }
    }
    
    // MARK: - Run Management
    
    func enqueueRun(runId: String, r2Key: String) async throws {
        guard let url = URL(string: "\(baseURL)/runs/\(runId)/enqueue") else {
            throw AuditorError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = ["r2Key": r2Key]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw AuditorError.uploadFailed("Failed to enqueue run")
        }
    }
    
    // MARK: - Status Polling
    
    func getRunStatus(runId: String) async throws -> RunStatus {
        guard let url = URL(string: "\(baseURL)/runs/\(runId)/status") else {
            throw AuditorError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw AuditorError.invalidResponse
        }
        
        return try JSONDecoder().decode(RunStatus.self, from: data)
    }
    
    // MARK: - Report URL
    
    func getReportUrl(runId: String) async throws -> ReportUrlResponse {
        guard let url = URL(string: "\(baseURL)/runs/\(runId)/report") else {
            throw AuditorError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw AuditorError.invalidResponse
        }
        
        return try JSONDecoder().decode(ReportUrlResponse.self, from: data)
    }
}

