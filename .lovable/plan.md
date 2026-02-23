

# Generate Contract PDF, Auto-Save to Lead Files, and Download

## Overview
When a contract is signed (either in person or remotely), automatically generate a professional PDF of the signed contract, upload it to the lead's Files section, and provide a download button. Also run this retroactively for Russ Pace's existing signed contract.

## Changes

### 1. New Utility: `src/lib/generateContractPDF.ts`
Create a PDF generator for signed contracts using jsPDF (already installed). The PDF will include:
- Company header (Next Generation Guttering)
- Customer information (name, address, phone, email)
- Scope of work
- Contract terms (price, down payment, balance, dates, payment info)
- Payment terms legal text (A-E)
- Customer signature image (rendered from base64 data URL)
- Second owner signature (if present)
- Rep name and agreement date
- "SIGNED" watermark or badge with signed date
- Footer with company contact info

### 2. Update `src/pages/dashboard/forms/GutterContract.tsx`
In `handleSave` (when finalizing / signing in person):
- After saving the contract to `lead_forms`, call the new PDF generator
- Convert the PDF to a Blob, upload it to the `lead-files` storage bucket
- Insert a record into `lead_files` table with `file_type: "contract"` and the file name `NGG_Contract_[CustomerName].pdf`
- Log activity: "Signed contract PDF added to files"

In the signed status bars (both remote-signed and in-person-signed):
- Add a "Download PDF" button next to the "Email Copy" button

### 3. Update `src/pages/public/SignContract.tsx`
After remote signing completes successfully:
- Generate the PDF and upload it to lead-files storage
- Insert into `lead_files` table
- This ensures remote-signed contracts also get auto-filed

### 4. Retroactive Execution for Russ Pace
After implementing, manually trigger the PDF generation for the existing signed contract on lead `dc45005b-867d-450a-bfe5-c5c030fa7f5e` by adding a one-time "Generate PDF" action or by navigating to the contract and using the new download button.

## Technical Details

### PDF Layout (jsPDF)
- Page: A4 portrait
- Header: Company name, "INSTALLATION CONTRACT" title, signed date
- Sections mirror the on-screen contract: Customer Info, Scope of Work, Contract Terms, Payment Terms, Signatures
- Signature rendered as embedded image from base64 data URL stored in `signature_data`
- "SIGNED" stamp with date in green

### File Storage Flow
```
PDF Blob -> supabase.storage.from("lead-files").upload(path, blob)
         -> supabase.from("lead_files").insert({ file_name, file_url, file_type: "contract", ... })
```

### Files Changed

| File | Change |
|------|--------|
| `src/lib/generateContractPDF.ts` | New - PDF generation utility for signed contracts |
| `src/pages/dashboard/forms/GutterContract.tsx` | Auto-generate and upload PDF on sign; add Download PDF button |
| `src/pages/public/SignContract.tsx` | Auto-generate and upload PDF after remote signing |

