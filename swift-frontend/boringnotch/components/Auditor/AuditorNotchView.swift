//
//  AuditorNotchView.swift
//  boringNotch
//
//  Compact view for displaying auditor status in the notch
//

import SwiftUI

struct AuditorNotchView: View {
    @StateObject private var viewModel = AuditorViewModel.shared
    @StateObject private var webSocket = WebSocketManager()
    
    var body: some View {
        HStack(spacing: 12) {
            // Status icon
            statusIcon
            
            // Progress info
            VStack(alignment: .leading, spacing: 4) {
                Text(statusTitle)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.white)
                
                Text(statusSubtitle)
                    .font(.system(size: 9))
                    .foregroundColor(.white.opacity(0.7))
            }
            
            // Progress indicator
            if case .processing = viewModel.uploadState {
                ZStack {
                    Circle()
                        .stroke(Color.white.opacity(0.2), lineWidth: 3)
                        .frame(width: 24, height: 24)
                    
                    Circle()
                        .trim(from: 0, to: CGFloat(webSocket.progress) / 100.0)
                        .stroke(Color.white, lineWidth: 3)
                        .frame(width: 24, height: 24)
                        .rotationEffect(.degrees(-90))
                        .animation(.easeInOut, value: webSocket.progress)
                    
                    Text("\(webSocket.progress)")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.white)
                }
            } else if case .uploading(let progress) = viewModel.uploadState {
                ProgressView(value: progress, total: 1.0)
                    .progressViewStyle(.circular)
                    .scaleEffect(0.7)
                    .tint(.white)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }
    
    private var statusIcon: some View {
        Group {
            switch viewModel.uploadState {
            case .idle:
                Image(systemName: "doc.text.magnifyingglass")
            case .uploading:
                Image(systemName: "arrow.up.doc.fill")
            case .processing:
                Image(systemName: "gearshape.2.fill")
            case .completed:
                Image(systemName: "checkmark.circle.fill")
            case .failed:
                Image(systemName: "exclamationmark.triangle.fill")
            }
        }
        .font(.system(size: 20))
        .foregroundColor(statusIconColor)
    }
    
    private var statusIconColor: Color {
        switch viewModel.uploadState {
        case .completed:
            return .green
        case .failed:
            return .red
        case .processing, .uploading:
            return .blue
        default:
            return .white
        }
    }
    
    private var statusTitle: String {
        switch viewModel.uploadState {
        case .idle:
            return "Audit Ready"
        case .uploading:
            return "Uploading..."
        case .processing:
            return webSocket.currentPhase
        case .completed:
            return "Complete"
        case .failed:
            return "Failed"
        }
    }
    
    private var statusSubtitle: String {
        switch viewModel.uploadState {
        case .idle:
            return "Drop a file to start"
        case .uploading:
            return viewModel.statusMessage
        case .processing:
            return webSocket.lastMessage
        case .completed:
            return "View results"
        case .failed(let error):
            return error.localizedDescription
        }
    }
}

#Preview {
    AuditorNotchView()
        .frame(width: 300, height: 60)
        .background(Color.black)
}

