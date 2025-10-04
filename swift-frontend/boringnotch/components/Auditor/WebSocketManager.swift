//
//  WebSocketManager.swift
//  boringNotch
//
//  WebSocket manager for real-time run updates
//

import Foundation
import Combine

struct ProgressMessage: Codable {
    let type: String
    let data: ProgressData
    let timestamp: Double
}

struct ProgressData: Codable {
    let phase: String
    let percent: Int
    let lastMessage: String
    let lastUpdated: Double?
}

class WebSocketManager: NSObject, ObservableObject, URLSessionWebSocketDelegate {
    @Published var isConnected = false
    @Published var currentPhase: String = "Initializing"
    @Published var progress: Int = 0
    @Published var lastMessage: String = ""
    @Published var error: String?
    
    private var webSocketTask: URLSessionWebSocketTask?
    private var session: URLSession!
    private var runId: String?
    
    override init() {
        super.init()
        session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
    }
    
    func connect(runId: String) {
        self.runId = runId
        
        guard let url = URL(string: "wss://auditor-edge.evanhaque1.workers.dev/ws/run/\(runId)") else {
            error = "Invalid WebSocket URL"
            return
        }
        
        webSocketTask = session.webSocketTask(with: url)
        webSocketTask?.resume()
        
        receiveMessage()
    }
    
    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
    }
    
    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                self?.handleMessage(message)
                self?.receiveMessage() // Continue listening
                
            case .failure(let error):
                print("WebSocket receive error: \(error)")
                DispatchQueue.main.async {
                    self?.error = error.localizedDescription
                    self?.isConnected = false
                }
            }
        }
    }
    
    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            guard let data = text.data(using: .utf8) else { return }
            
            do {
                let progressMsg = try JSONDecoder().decode(ProgressMessage.self, from: data)
                
                DispatchQueue.main.async {
                    self.isConnected = true
                    
                    switch progressMsg.type {
                    case "progress":
                        self.currentPhase = progressMsg.data.phase
                        self.progress = progressMsg.data.percent
                        self.lastMessage = progressMsg.data.lastMessage
                        
                    case "done":
                        self.currentPhase = "Complete"
                        self.progress = 100
                        self.lastMessage = "Processing complete"
                        
                    case "error":
                        self.error = progressMsg.data.lastMessage
                        
                    default:
                        break
                    }
                }
            } catch {
                print("Failed to decode WebSocket message: \(error)")
            }
            
        case .data(let data):
            print("Received binary data: \(data.count) bytes")
            
        @unknown default:
            break
        }
    }
    
    // MARK: - URLSessionWebSocketDelegate
    
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        DispatchQueue.main.async {
            self.isConnected = true
        }
        print("WebSocket connected")
    }
    
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        DispatchQueue.main.async {
            self.isConnected = false
        }
        print("WebSocket disconnected")
    }
}

