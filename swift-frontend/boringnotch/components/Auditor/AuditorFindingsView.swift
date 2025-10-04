//
//  AuditorFindingsView.swift
//  boringNotch
//
//  View for displaying audit findings
//

import SwiftUI

struct AuditorFindingsView: View {
    let findings: [Finding]
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if findings.isEmpty {
                    emptyState
                } else {
                    ForEach(findings) { finding in
                        FindingCard(finding: finding)
                    }
                }
            }
            .padding()
        }
        .background(Color(.windowBackgroundColor).opacity(0.95))
    }
    
    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.shield.fill")
                .font(.system(size: 48))
                .foregroundColor(.green)
            
            Text("No Issues Found")
                .font(.headline)
            
            Text("Your document looks good!")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(40)
    }
}

struct FindingCard: View {
    let finding: Finding
    
    private var severityColor: Color {
        switch finding.severity.lowercased() {
        case "high", "critical":
            return .red
        case "medium":
            return .orange
        default:
            return .yellow
        }
    }
    
    private var severityIcon: String {
        switch finding.severity.lowercased() {
        case "high", "critical":
            return "exclamationmark.triangle.fill"
        case "medium":
            return "exclamationmark.circle.fill"
        default:
            return "info.circle.fill"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: severityIcon)
                    .foregroundColor(severityColor)
                
                Text(finding.title)
                    .font(.headline)
                
                Spacer()
                
                Text(finding.severity.uppercased())
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(severityColor.opacity(0.2))
                    .foregroundColor(severityColor)
                    .cornerRadius(4)
            }
            
            if let detail = finding.detail {
                Text(detail)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            HStack {
                Text("Code: \(finding.code)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                if let createdAt = finding.createdAt {
                    Text(createdAt)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.controlBackgroundColor))
        .cornerRadius(12)
    }
}

#Preview {
    AuditorFindingsView(findings: [
        Finding(
            id: "1",
            runId: "run_1",
            code: "DUP_INVOICE",
            severity: "medium",
            title: "Duplicate Invoice Detected",
            detail: "Found 2 transactions with identical vendor, date, and amount.",
            createdAt: "2024-01-15"
        ),
        Finding(
            id: "2",
            runId: "run_1",
            code: "ROUND_NUMBER",
            severity: "low",
            title: "Suspiciously Round Amount",
            detail: "Transaction has a round amount of $1000.00",
            createdAt: "2024-01-15"
        )
    ])
}

