
The goal is to update the labels for the gutter-specific lead creation forms to be more descriptive and distinct from the roofing forms. I will also add the gutter inspection and appointment forms to the admin lead creation dialog for feature parity with the canvasser page.

### 1. Update Labels in Canvasser Lead Creation
I will update the labels for the gutter sections in `CreateCanvasserLead.tsx` to include the "Gutter" prefix as requested:
- **"📋 Fill Out Inspection Checklist"** becomes **"📋 Fill Out Gutter Inspection Checklist"**
- **"📅 Schedule a Consultation"** becomes **"📅 Schedule a Gutter Consultation"**

### 2. Add Gutter Forms to Admin/Rep Lead Creation
Currently, the admin `CreateLeadDialog.tsx` only has detailed forms for roofing. I will add the gutter inspection checklist and gutter consultation sections to this dialog when "Gutters & Protection" is selected as the service type.
- **State Management**: Add state for gutter conditions, perimeter checks, inside checks, and appointment details.
- **UI Components**: Implement the same collapsible sections used in the canvasser flow, but within the admin dialog.
- **Data Persistence**:
  - When the lead is created, the gutter data will be stored in the `form_data` JSONB field.
  - Separate `lead_forms` records of type `inspection` and `appointment` will be created if those sections were filled out.

### 3. Update Badge Labels in Manager Queue
In `src/pages/admin/Leads.tsx`, I will ensure the badges in the unassigned queue clearly distinguish between gutter and roofing forms for the managers.

Technical Details:
- **Constants**: I will move or duplicate the gutter inspection constants (conditions, perimeter items, etc.) into `CreateLeadDialog.tsx` to power the checklist.
- **Conditional Rendering**: These sections will only appear when `form.service_type === 'gutters'`.
- **Submission Logic**: Similar to the roofing implementation, I will retrieve the lead UUID after creation and then perform the necessary `lead_forms` inserts and `quote_requests` updates.

