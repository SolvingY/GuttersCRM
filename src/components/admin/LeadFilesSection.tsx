import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Download, Trash2, Loader2, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface LeadFilesSectionProps {
  leadId: string;
  isAdmin: boolean;
}

const fileTypeOptions = [
  { value: "contract", label: "Contract" },
  { value: "drawing", label: "Drawing" },
  { value: "warranty", label: "Warranty" },
  { value: "photo", label: "Photo" },
  { value: "other", label: "Other" },
];

const fileTypeBadgeClasses: Record<string, string> = {
  contract: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  drawing: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  warranty: "bg-green-500/10 text-green-600 border-green-500/30",
  photo: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  other: "bg-muted text-muted-foreground",
};

export function LeadFilesSection({ leadId, isAdmin }: LeadFilesSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("other");

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["lead-files", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_files")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: uploaderProfiles = {} } = useQuery({
    queryKey: ["lead-file-uploaders", leadId, files],
    queryFn: async () => {
      const uploaderIds = [...new Set((files as any[]).map((f: any) => f.uploaded_by).filter(Boolean))];
      if (uploaderIds.length === 0) return {};
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", uploaderIds);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.full_name || "Unknown"; });
      return map;
    },
    enabled: (files as any[]).length > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (file: any) => {
      // Delete from storage
      const pathParts = file.file_url.split("/lead-files/");
      if (pathParts[1]) {
        await supabase.storage.from("lead-files").remove([pathParts[1]]);
      }
      // Delete from DB
      const { error } = await supabase.from("lead_files").delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-files", leadId] });
      toast({ title: "File deleted" });
    },
    onError: (err: any) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const filePath = `${user.id}/${leadId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("lead-files").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("lead-files").getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("lead_files").insert({
        lead_id: leadId,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: selectedType,
        file_size: file.size,
      });
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["lead-files", leadId] });
      toast({ title: "File uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const pathParts = file.file_url.split("/lead-files/");
      if (!pathParts[1]) return;
      const { data, error } = await supabase.storage.from("lead-files").createSignedUrl(pathParts[1], 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg uppercase">Files</h2>
        <Badge variant="outline" className="text-xs">{(files as any[]).length}</Badge>
      </div>

      {/* Upload controls */}
      <div className="flex gap-2 mb-4">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fileTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
        />
      </div>

      {/* File list */}
      {isLoading ? (
        <div className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
      ) : (files as any[]).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No files uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {(files as any[]).map((file: any) => (
            <div key={file.id} className="flex items-center gap-3 p-2 rounded-md border border-border hover:bg-muted/30 transition-colors">
              <File className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file_name}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${fileTypeBadgeClasses[file.file_type] || fileTypeBadgeClasses.other}`}>
                    {file.file_type}
                  </Badge>
                  {file.file_size && <span>{formatSize(file.file_size)}</span>}
                  <span>{new Date(file.created_at).toLocaleDateString()}</span>
                  {(uploaderProfiles as Record<string, string>)[file.uploaded_by] && (
                    <span>by {(uploaderProfiles as Record<string, string>)[file.uploaded_by]}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(file)}>
                  <Download className="w-3 h-3" />
                </Button>
                {(isAdmin || file.uploaded_by === user?.id) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(file)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
