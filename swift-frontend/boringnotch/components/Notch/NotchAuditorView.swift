//
//  NotchAuditorView.swift
//  boringNotch
//
//  Created by Assistant on 2024-12-19.
//

import SwiftUI

struct NotchAuditorView: View {
    @EnvironmentObject var vm: BoringViewModel
    @StateObject var tvm = TrayDrop.shared
    @State private var isProcessing = false
    @State private var runId = ""

    var body: some View {
        HStack {
            // Left side: Run Audit button (replaces AirDrop)
            auditButton
            // Right side: Drop zone panel (same as Shelf)
            panel
                .onDrop(of: [.data], isTargeted: $vm.dropZoneTargeting) { providers in
                    vm.dropEvent = true
                    DispatchQueue.global().async {
                        tvm.load(providers)
                    }
                    return true
                }
        }
    }

    var auditButton: some View {
        Rectangle()
            .fill(.white.opacity(0.1))
            .opacity(0.5)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay { auditLabel }
            .aspectRatio(1, contentMode: .fit)
            .contentShape(Rectangle())
    }
    
    var auditLabel: some View {
        VStack(spacing: 8) {
            Image(systemName: isProcessing ? "gearshape.2.fill" : "play.circle.fill")
                .font(.system(size: 24))
                .symbolEffect(.pulse, isActive: isProcessing)
            
            Text("Run Audit")
                .font(.system(.headline, design: .rounded))
        }
        .foregroundStyle(.gray)
        .contentShape(Rectangle())
        .onTapGesture {
            runAudit()
        }
    }

    var panel: some View {
        RoundedRectangle(cornerRadius: 16)
            .strokeBorder(style: StrokeStyle(lineWidth: 4, dash: [10]))
            .foregroundStyle(.white.opacity(0.1))
            .overlay {
                content
                    .padding()
            }
            .animation(vm.animation, value: tvm.items)
            .animation(vm.animation, value: tvm.isLoading)
    }

    var content: some View {
        Group {
            if tvm.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .symbolVariant(.fill)
                        .symbolRenderingMode(.hierarchical)
                        .foregroundStyle(.white, .gray)
                        .imageScale(.large)
                    
                    Text("Drop PDF or CSV here")
                        .foregroundStyle(.gray)
                        .font(.system(.title3, design: .rounded))
                        .fontWeight(.medium)
                }
            } else {
                ScrollView(.horizontal) {
                    HStack(spacing: spacing) {
                        ForEach(tvm.items) { item in
                            DropItemView(item: item)
                        }
                    }
                    .padding(spacing)
                }
                .padding(-spacing)
                .scrollIndicators(.never)
            }
        }
    }
    
    private var spacing: CGFloat { 8 }
    
    private func runAudit() {
        guard !tvm.isEmpty else { return }
        
        Task {
            isProcessing = true
            
            do {
                // Get the first file from the tray
                guard let firstItem = tvm.items.first else { return }
                let fileURL = firstItem.storageURL
                
                let response = try await uploadFile(fileURL)
                runId = response.runId
                
                // Clear the tray after successful upload
                DispatchQueue.main.async {
                    tvm.removeAll()
                }
                
                // Reset after 3 seconds
                try await Task.sleep(for: .seconds(3))
                isProcessing = false
                runId = ""
                
            } catch {
                print("Audit failed: \(error)")
                isProcessing = false
            }
        }
    }
    
    private func uploadFile(_ fileURL: URL) async throws -> UploadResponse {
        // Determine content type
        let contentType = fileURL.pathExtension.lowercased() == "csv" ? "text/csv" : "application/pdf"
        
        // Step 1: Create upload
        let createURL = URL(string: "https://auditor-edge.evanhaque1.workers.dev/uploads/create")!
        var request = URLRequest(url: createURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "filename": fileURL.lastPathComponent,
            "contentType": contentType,
            "tenantId": "notch_app_user"
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let uploadResp = try JSONDecoder().decode(UploadResponse.self, from: data)
        
        // Step 2: Upload to R2
        let fileData = try Data(contentsOf: fileURL)
        var r2Request = URLRequest(url: URL(string: uploadResp.r2PutUrl)!)
        r2Request.httpMethod = "PUT"
        r2Request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        r2Request.httpBody = fileData
        
        _ = try await URLSession.shared.data(for: r2Request)
        
        // Step 3: Enqueue for processing
        let enqueueURL = URL(string: "https://auditor-edge.evanhaque1.workers.dev/runs/\(uploadResp.runId)/enqueue")!
        var enqueueRequest = URLRequest(url: enqueueURL)
        enqueueRequest.httpMethod = "POST"
        enqueueRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let enqueueBody: [String: Any] = ["r2Key": uploadResp.r2Key]
        enqueueRequest.httpBody = try JSONSerialization.data(withJSONObject: enqueueBody)
        
        _ = try await URLSession.shared.data(for: enqueueRequest)
        
        return uploadResp
    }
}

struct UploadResponse: Codable {
    let runId: String
    let r2PutUrl: String
    let r2Key: String
}
