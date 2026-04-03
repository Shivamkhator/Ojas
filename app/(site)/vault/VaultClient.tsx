"use client";
import Image from "next/image";
import React, { useState, useEffect, useMemo, JSX } from "react";
import {
    Tabs,
    TabsContent,
    TabsContents,
    TabsList,
    TabsTrigger,
} from '@/components/animate-ui/components/radix/tabs';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ChevronDown, ChevronRightIcon, Trash2, Save, TrendingUp, Activity, FileText, FileSpreadsheet, FileX } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { Session } from "next-auth";

import { useDropzone } from "react-dropzone";
import { useTheme } from "next-themes"


type VaultClientProps = {
    user: Session["user"];
};

type Note = {
    id: string;
    title: string;
    body: string;
    createdAt: string;
};

type Attachment = {
    id: string;
    name: string;
    type: string;
    originalSize: number;
    contentType: "text" | "ocr" | "pdf" | "docx" | "xlsx" | "error";
    content: string;
    extractedAt: string;
};

function formatDate(date?: Date) {
    if (!date) return "";
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

const VaultIcon: JSX.Element = (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="3" y="4" width="18" height="18" rx="2" />

        <circle cx="12" cy="13" r="4" />
        <circle cx="12" cy="13" r="2" />

        <path d="M12 9v2" />
        <path d="M12 15v2" />
        <path d="M8 13h2" />
        <path d="M14 13h2" />

        <line x1="3" y1="8" x2="5" y2="8" />
        <line x1="3" y1="18" x2="5" y2="18" />
    </svg>
)

export default function VaultClient({ user }: VaultClientProps) {
    const { theme } = useTheme()

    const [emailEnabled, setEmailEnabled] = React.useState(false);
    const [savingEmailPref, setSavingEmailPref] = React.useState(false);

    const [searchQuery, setSearchQuery] = useState("");

    const [notes, setNotes] = useState<Note[]>([]);
    const [noteTitle, setNoteTitle] = useState("");
    const [noteBody, setNoteBody] = useState("");
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editBody, setEditBody] = useState("");
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [processingFiles, setProcessingFiles] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkTitle, setLinkTitle] = useState("");
    const [links, setLinks] = useState<{ id: string; url: string; title?: string }[]>([]);
    const [activeNote, setActiveNote] = useState<Note | null>(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [savingNote, setSavingNote] = useState(false);

    const src = theme === "dark" ? ("/banner_dark.png") : ("/banner_light.png");
    const src_md = theme === "dark" ? ("/banner_dark_md.png") : ("/banner_light_md.png");


    const router = useRouter();

    const { getRootProps, getInputProps } = useDropzone({
        onDrop: (files) => handleFiles(files as any),
        maxSize: 5 * 1024 * 1024, // 5MB
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
        },
        onDropRejected: (rejectedFiles) => {
            alert('Only Images, Word (.docx), and Excel (.xlsx, .xls) files are supported');
        }
    });

    const greeting = useMemo(
        () => (Math.random() > 0.5 ? "Namaste" : "Konnichiwa"),
        []
    );

    useEffect(() => {
        fetch("/api/vault/notes").then(r => r.json()).then(setNotes);
        fetch("/api/vault/attachments").then(r => r.json()).then(setAttachments);
        fetch("/api/vault/links").then(r => r.json()).then(setLinks);
    }, []);

    async function handleSaveNote() {
        if (!noteBody.trim()) return;

        setSavingNote(true);

        const res = await fetch("/api/vault/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: noteTitle || "Untitled",
                body: noteBody,
            }),
        });

        if (!res.ok) {
            setSavingNote(false);
            return;
        }

        const savedNote = await res.json();

        setNotes(prev => [
            {
                id: savedNote.id,
                title: savedNote.title || "Untitled",
                body: savedNote.body,
                createdAt: savedNote.createdAt,
            },
            ...prev,
        ]);

        setNoteTitle("");
        setNoteBody("");
        setSavingNote(false);
    }


    async function deleteNote(id: string) {
        setNotes(prev => prev.filter(n => n.id !== id));

        await fetch(`/api/vault/notes/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });

        setIsNoteModalOpen(false);
        setActiveNote(null);
    }

    async function handleFiles(files: File[]) {
        setProcessingFiles(true);

        try {
            const formData = new FormData();
            files.forEach(file => formData.append("files", file));

            const response = await fetch("/api/vault/attachments/extract", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            // 👇 ignore response body, just refetch
            const updated = await fetch("/api/vault/attachments").then(r => r.json());
            setAttachments(updated);
        } catch (error) {
            console.error("Error uploading files:", error);
            alert("Failed to process files");
        } finally {
            setProcessingFiles(false);
        }
    }


    async function handleSaveLink() {
        if (!linkUrl) return;

        const newLink = {
            id: Math.random().toString(36).substr(2, 9),
            url: linkUrl,
            title: linkTitle
        };

        const updatedLinks = [...links, newLink];
        setLinks(updatedLinks);

        await fetch("/api/vault/links", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ links: updatedLinks }),
        });

        setLinkUrl("");
        setLinkTitle("");
    }

    async function deleteLink(id: string) {
        const updatedLinks = links.filter((link) => link.id !== id);
        setLinks(updatedLinks);

        await fetch(`/api/vault/links/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
    }

    async function deleteAttachments(id: string) {
        setAttachments(prev => prev.filter(a => a.id !== id));
        await fetch(`/api/vault/attachments/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
    }

    return (
        <div className="min-h-screen">
            <div className="flex w-full max-w-5xl mx-auto flex-col gap-2 md:p-8">

                <Image
                    src={src}
                    alt="Owl Banner"
                    width={1000}
                    height={250}
                    className="w-full block md:hidden"
                />
                <Image
                    src={src_md}
                    alt="Owl Banner"
                    width={1000}
                    height={200}
                    className="w-full rounded-t-2xl hidden md:block h-[36svh]"
                />

            </div>
            <div className="flex w-full max-w-5xl mx-auto flex-col gap-2 p-4 md:p-8">


                {/* Main Tabs */}
                <Tabs defaultValue="notes" className="w-full md:-mt-16">
                    <TabsList className="w-full bg-overlay backdrop-blur-sm">
                        <TabsTrigger value="notes" className="data-[state=active]:text-background dark:data-[state=active]:text-white rounded-2xl">
                            Notes
                        </TabsTrigger>
                        <TabsTrigger value="attachments" className="data-[state=active]:text-background dark:data-[state=active]:text-white rounded-2xl">
                            Attachments
                        </TabsTrigger>
                        <TabsTrigger value="links" className="data-[state=active]:text-background dark:data-[state=active]:text-white   rounded-2xl">
                            Links
                        </TabsTrigger>
                    </TabsList>

                    <Card className="bg-overlay rounded-2xl border border-overlay backdrop-blur-sm">
                        <TabsContents>
                            <TabsContent value="notes">

                                <CardContent>
                                    <div className="space-y-2 mt-6 mb-6">

                                        {/* Title */}
                                        <Input
                                            placeholder="Title (optional)"
                                            className="bg-card-overlay border-overlay h-12"
                                            value={noteTitle}
                                            onChange={(e) => setNoteTitle(e.target.value)}
                                        />

                                        {/* Large Textarea for any text */}
                                        <Textarea
                                            placeholder="Write or paste anything here…"
                                            className="min-h-50 bg-card-overlay border-overlay resize-none"
                                            value={noteBody}
                                            maxLength={12000}
                                            onChange={(e) => setNoteBody(e.target.value)}
                                        />

                                        <div className="flex justify-between text-xs text-text">
                                            <span>{noteBody.length} / 12000 characters</span>
                                            <span>{noteBody.trim() ? noteBody.trim().split(/\s+/).length : 0} words</span>
                                        </div>

                                        {/* Save Button */}
                                        <Button
                                            onClick={handleSaveNote}
                                            className="w-full h-12 bg-action text-white"
                                        >
                                            <Save className="h-4 w-4 mr-2" />
                                            {savingNote ? 'Saving...' : 'Save Note'}
                                        </Button>

                                    </div>

                                </CardContent>
                                {notes.length > 0 && (
                                    <CardContent>
                                        <Card className="bg-card-overlay backdrop-blur-sm border-overlay mb-4">
                                            <CardHeader>
                                                <CardTitle className="flex items-center justify-center gap-2">
                                                    <Save className="h-5 w-5 text-text" />
                                                    Saved Notes
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-6">
                                                    <p className="text-sm text-text flex items-center justify-center gap-2">
                                                        Your vault insights will appear here once you have enough data.
                                                    </p>
                                                    <Input
                                                        placeholder="Search notes..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="bg-card-overlay border-overlay mb-3"
                                                    />
                                                    <div className="space-y-2">
                                                        {notes
                                                            .filter(note =>
                                                                note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                note.body.toLowerCase().includes(searchQuery.toLowerCase())
                                                            )
                                                            .map((note) => (

                                                                <div
                                                                    key={note.id}
                                                                    className="flex items-center justify-between p-3 rounded-lg bg-overlay border border-overlay"
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-medium">{note.title || "Untitled"}</span>
                                                                        <span className="text-xs text-text truncate max-w-62.5">
                                                                            {note.body}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => {
                                                                                setActiveNote(note);
                                                                                setEditTitle(note.title);
                                                                                setEditBody(note.body);
                                                                                setIsEditingNote(false);
                                                                                setIsNoteModalOpen(true);
                                                                            }}

                                                                        >
                                                                            View
                                                                        </Button>

                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={() => deleteNote(note.id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                                        </Button>
                                                                    </div>

                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </CardContent>)}
                            </TabsContent>


                            <TabsContent value="attachments">
                                <CardContent>
                                    <div className="space-y-4">

                                        {/* Upload Box */}
                                        <div
                                            {...getRootProps()}
                                            className="flex flex-col items-center bg-card-overlay justify-center gap-2 p-6 border-2 border-dashed border-overlay rounded-xl cursor-pointer hover:bg-overlay transition my-6"
                                        >
                                            <input {...getInputProps()} />
                                            <span className="text-sm font-medium">
                                                {processingFiles ? 'Uploading...' : 'Upload files'}
                                            </span>
                                            <span className="text-xs text-gray-primary">
                                                Images, PDFs, Docs, anything
                                            </span>
                                        </div>

                                    </div>
                                </CardContent>
                                {attachments.length > 0 && (
                                    <CardContent>
                                        <Card className="bg-card-overlay backdrop-blur-sm border-overlay mb-4">
                                            <CardHeader>
                                                <CardTitle className="flex items-center justify-center gap-2">
                                                    <Save className="h-5 w-5 text-text" />
                                                    Saved Attachments
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-6">
                                                    <Input
                                                        placeholder="Search attachments..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="bg-card-overlay border-overlay mb-3"
                                                    />
                                                    <div className="space-y-2">
                                                        {attachments
                                                            .filter((attachments) => attachments.name?.toLowerCase().includes(searchQuery.toLowerCase())
                                                            )
                                                            .map((attachments) => (

                                                                <div
                                                                    key={attachments.id}
                                                                    className="flex items-center justify-between p-3 rounded-lg bg-overlay border border-overlay"
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-medium">{attachments.name || "Untitled"}</span>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={() => deleteAttachments(attachments.id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                                        </Button>
                                                                    </div>

                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </CardContent>)}
                            </TabsContent>

                            <TabsContent value="links">
                                <CardContent>
                                    <div className="space-y-2">

                                        {/* Optional title */}
                                        <Input
                                            placeholder="Title (optional)"
                                            className="bg-card-overlay border-overlay mt-6 h-12"
                                            value={linkTitle}
                                            onChange={(e) => setLinkTitle(e.target.value)}
                                        />

                                        {/* Link input */}
                                        <Input
                                            placeholder="Paste a link here (GitHub repo, website, doc, etc.)"
                                            className="bg-card-overlay border-overlay h-12"
                                            value={linkUrl}
                                            onChange={(e) => setLinkUrl(e.target.value)}
                                        />

                                        {/* Save */}

                                        <Button
                                            onClick={handleSaveLink}
                                            className="w-full h-12 bg-action text-white my-4 items-center justify-center flex"
                                        >
                                            <Save className="h-4 w-4 mr-2" />
                                            Save Link
                                        </Button>

                                    </div>
                                </CardContent>
                                {links.length > 0 && (
                                    <CardContent>
                                        <Card className="bg-card-overlay backdrop-blur-sm border-overlay mb-4">
                                            <CardHeader>
                                                <CardTitle className="flex items-center justify-center gap-2">
                                                    <Save className="h-5 w-5 text-text" />
                                                    Saved Links
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-6">
                                                    <Input
                                                        placeholder="Search links..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="bg-card-overlay border-overlay mb-3"
                                                    />
                                                    <div className="space-y-2">
                                                        {links
                                                            .filter(link => link.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                link.url.toLowerCase().includes(searchQuery.toLowerCase())
                                                            )
                                                            .map((link) => (

                                                                <div
                                                                    key={link.id}
                                                                    className="flex items-center justify-between p-3 rounded-lg bg-overlay border border-overlay"
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-medium">{link.title || "Untitled"}</span>
                                                                        <span className="text-xs text-text truncate max-w-62.5">
                                                                            {link.url}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <Button size="icon" variant="ghost" onClick={() => window.open(link.url, "_blank")}>
                                                                            Visit
                                                                        </Button>
                                                                        <Button
                                                                            size="icon"
                                                                            variant="ghost"
                                                                            onClick={() => deleteLink(link.id)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                                        </Button>
                                                                    </div>

                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </CardContent>)}
                            </TabsContent>

                        </TabsContents>
                    </Card>
                </Tabs>

            </div>
            {
                isNoteModalOpen && activeNote && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background backdrop-blur-sm">

                        <div className="w-full max-w-2xl rounded-xl bg-card-overlay border border-overlay p-6 shadow-xl">

                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        {activeNote.title || "Untitled"}
                                    </h2>
                                    <p className="text-xs opacity-60">
                                        {formatDate(new Date(activeNote.createdAt))}
                                    </p>
                                </div>

                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                        setIsNoteModalOpen(false);
                                        setActiveNote(null);
                                    }}
                                >
                                    ✕
                                </Button>
                            </div>

                            {isEditingNote ? (
                                <div className="space-y-3">
                                    <Input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="Title"
                                        className="bg-overlay border-overlay"
                                    />

                                    <Textarea
                                        value={editBody}
                                        onChange={(e) => setEditBody(e.target.value)}
                                        className="min-h-75 bg-overlay border-overlay"
                                    />
                                </div>
                            ) : (
                                <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
                                    {activeNote.body}
                                </div>
                            )}


                            <div className="flex justify-between items-center mt-6">
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsEditingNote(prev => !prev)}
                                    >
                                        {isEditingNote ? "Cancel" : "Edit"}
                                    </Button>
                                    {isEditingNote && activeNote?.id && (
                                        <Button
                                            onClick={async () => {
                                                if (!activeNote?.id) return;

                                                const res = await fetch(`/api/vault/notes/${activeNote.id}`, {
                                                    method: "PUT",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        title: editTitle,
                                                        body: editBody,
                                                    }),
                                                });

                                                if (res.ok) {
                                                    setNotes(prev =>
                                                        prev.map(n =>
                                                            n.id === activeNote.id
                                                                ? { ...n, title: editTitle, body: editBody }
                                                                : n
                                                        )
                                                    );
                                                    setActiveNote(prev =>
                                                        prev ? { ...prev, title: editTitle, body: editBody } : prev
                                                    );
                                                    setIsEditingNote(false);
                                                }
                                            }}
                                        >
                                            Save Changes
                                        </Button>
                                    )}

                                    <Button
                                        variant="destructive"
                                        onClick={() => deleteNote(activeNote.id)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                </div>
                            </div>

                        </div>
                    </div>
                )
            }

        </div >
    );
}
