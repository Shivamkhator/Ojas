"use client"

import Image from "next/image";
import { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import { ChevronRightIcon, Brain, RotateCcw, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Session } from "next-auth"
import { useTheme } from "next-themes"


type OjasClientProps = {
    user: Session["user"];
};

type Message = {
    role: "user" | "assistant";
    content: string;
    time?: string;
};

const MAX_QUESTIONS = 5;

export default function AskOjasPage({ user }: OjasClientProps) {
    const [question, setQuestion] = useState("")
    const [loading, setLoading] = useState(false)
    const [insights, setInsights] = useState<any>(null);
    const [loadingVault, setLoadingVault] = useState(true);
    const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
    const [questionCount, setQuestionCount] = useState(0);
    const [roundedTop, setRoundedTop] = useState(true);

    const router = useRouter()
    const { theme } = useTheme()



    const src = theme === "dark" ? ("/banner_dark.png") : ("/banner_light.png");
    const src_md = theme === "dark" ? ("/banner_dark_md.png") : ("/banner_light_md.png");

    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversationHistory, loading]);


    useEffect(() => {
        let isMounted = true;
        const loadVault = async () => {
            try {
                const [resAttachments, resLinks, resNotes] = await Promise.all([
                    fetch("/api/vault/attachments"),
                    fetch("/api/vault/links"),
                    fetch("/api/vault/notes"),
                ]);

                if (!resAttachments.ok || !resLinks.ok || !resNotes.ok) {
                    if (isMounted)
                        setInsights(null);
                } else {

                    const [attachments, links, notes] = await Promise.all([
                        resAttachments.json(),
                        resLinks.json(),
                        resNotes.json(),
                    ]);

                    const combined = {
                        attachments,
                        links,
                        notes,
                    };
                    if (isMounted) {
                        setInsights(combined);
                    }
                }
            } catch (err) {
                console.error("Failed to load vault", err);
                setInsights(null);
            } finally {
                setLoadingVault(false);
            }
        };

        loadVault();
        return () => { isMounted = false; };
    }, []);

    const handleAsk = async () => {
        if (!question.trim()) return
        if (questionCount >= MAX_QUESTIONS) return
        setRoundedTop(false)

        setLoading(true)
        const currentQuestion = question.trim();
        setQuestion("")
        try {
            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: currentQuestion, conversationHistory }),
            })

            const data = await res.json()
            if (data.limitReached) {


                setConversationHistory(prev => [
                    ...prev,
                    { role: 'user', content: currentQuestion, },
                    { role: 'assistant', content: "You've reached the maximum of 5 questions. Please start a new conversation." }
                ]);
                return;
            }
            const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            // Add both user question and assistant answer to history
            setConversationHistory(prev => [
                ...prev,
                { role: 'user', content: currentQuestion, time: now },
                { role: 'assistant', content: data.answer, time: now }
            ]);
            setQuestionCount(prev => prev + 1);

        } catch {
            setConversationHistory(prev => [
                ...prev,
                { role: 'user', content: currentQuestion, },
                { role: 'assistant', content: "Sorry, I couldn't process your question. Please try again." }
            ]);
        } finally {
            setLoading(false)
        }
    }

    const handleReset = () => {
        setConversationHistory([]);
        setQuestionCount(0);
        setRoundedTop(true)

        setQuestion("");
    }

    if (!insights) {
        return (
            <div className="flex w-full max-w-5xl mx-auto flex-col gap-2 md:p-8">

                {/* Header */}

                <div className="flex w-full max-w-5xl mx-auto flex-col gap-2">

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
                        className="w-full rounded-2xl hidden md:block h-[36svh]"
                    />

                </div>
                {loadingVault ? (
                    <div className=" flex flex-col bg-card-overlay backdrop-blur-sm border-pink-100 rounded-2xl p-4 md:p-6 lg:col-span-5 lg:row-span-2 mx-4 md:mx-0">
                        <div className="flex flex-col items-center justify-center h-[40svh]">
                            <video src="/Loader.webm" className="mx-auto w-16 h-16" autoPlay loop muted />
                        </div>
                    </div>
                ) : (
                    <div className=" flex flex-col bg-card-overlay backdrop-blur-sm border border-overlay rounded-2xl p-4 md:p-6 lg:col-span-5 lg:row-span-2">
                        <div className="flex flex-col items-center justify-center h-[40svh]">
                            <Brain className="h-12 w-12 text-pink-500 mb-4" />
                            <p className="text-gray-500 text-lg">No personal data available.</p>
                            <p className='text-gray-400 text-sm text-center'>Add more data in vault to chat with Ojas.</p>
                        </div>
                    </div>
                )}
            </div >
        )
    }

    return (
        <div className="mx-auto min-h-screen max-w-5xl flex flex-col gap-2 md:p-8 ">

            {/* Header */}
            <div>
                <div className="flex w-full max-w-5xl mx-auto flex-col gap-2 mb-4">

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
            </div>

            <div className="flex-1 pb-4 space-y-2 -mt-4 md:-mt-6">

                {/* Conversation History */}
                {conversationHistory.length > 0 && (
                    <>
                        {conversationHistory.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                            >

                                <Card
                                    key={idx}
                                    className={`
    rounded-2xl border mx-4 md:mx-0
    ${msg.role === "user"
                                            ? `ml-auto bg-card-overlay border-overlay shadow-sm ${idx == 0 && 'md:rounded-t-none border-t-0'}`
                                            : "mr-auto bg-overlay border-overlay shadow"}
    max-w-[84%]
  `}
                                >

                                    <CardContent className={`p-4`}>
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-text mb-1">
                                                    {msg.role === 'user' ? 'You' : 'Ojas'} • {msg.time}
                                                </p>
                                                <div
                                                    className={`
    prose prose-sm max-w-none
    ${msg.role === "user" ? "text-text" : "text-text"}
  `}
                                                >
                                                    <ReactMarkdown
                                                        components={{
                                                            p: ({ node, ...props }) => <p className="" {...props} />,
                                                            ul: ({ node, ...props }) => (
                                                                <ul className="list-disc pl-4 my-1" {...props} />
                                                            ),
                                                            ol: ({ node, ...props }) => (
                                                                <ol className="list-decimal pl-4 my-1" {...props} />
                                                            ),
                                                            li: ({ node, ...props }) => <li className="my-0" {...props} />,
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>

                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                        ))}
                        <div ref={bottomRef} />

                    </>
                )}

                {/* Loading State */}
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`mr-auto bg-overlay border border-overlay rounded-2xl px-4 py-3 mx-4 md:mx-0 w-fit shadow-sm ${questionCount == 0 && 'rounded-t-none'}`}
                    >
                        <p className="text-sm text-text">
                            Ojas is typing<span className="animate-pulse">...</span>
                        </p>
                    </motion.div>
                )}

                {/* Chat Card */}
                <Card className={`bg-overlay border-card-overlay backdrop-blur-xl rounded-3xl ${roundedTop && 'md:rounded-t-none'} h-fit p-2 mx-4 md:mx-0`}>
                    <CardContent className="p-2 space-y-3">
                        {/* Question Counter and Reset */}
                        {questionCount > 0 && (<div className="flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-text">
                                    Questions: {questionCount}/{MAX_QUESTIONS}
                                </span>
                                {questionCount >= MAX_QUESTIONS && (
                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                )}
                            </div>
                            {conversationHistory.length > 0 && (
                                <Button
                                    onClick={handleReset}
                                    variant="ghost"
                                    className="text-red-500 hover:bg-red-500/70 hover:text-text flex items-center gap-2"
                                    size="sm"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    New Conversation
                                </Button>
                            )}
                        </div>
                        )}


                        {/* Input */}
                        <div className="flex flex-col sm:flex-row gap-2 bg-overlay/70 p-2 rounded-lg border border-overlay">
                            <Input
                                placeholder="Ask anything to Ojas..."
                                value={question}
                                disabled={loading || questionCount >= MAX_QUESTIONS}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                                className="h-12 bg-transparent border-none shadow-none focus-visible:ring-0"
                            />

                            <Button
                                onClick={handleAsk}
                                disabled={loading || questionCount >= MAX_QUESTIONS}
                                className="h-12 px-8 bg-action text-white flex items-center gap-2 active:scale-105 transition rounded-md"
                            >
                                <Brain className="h-4 w-4" />
                                {loading ? "Thinking..." : "Ask"}
                            </Button>
                        </div>


                        {questionCount >= MAX_QUESTIONS && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                                <p className="text-sm text-amber-800">
                                    You've reached the maximum of 5 questions. Start a new conversation to continue.
                                </p>
                            </div>
                        )}


                        <div className="p-3 rounded-xl bg-card-overlay border border-red-500/40">
                            <p className="text-sm uppercase text-red-500/80 font-semibold">
                                Disclaimer
                            </p>
                            <p className="text-sm font-semibold text-red-500/60 mt-2 ">
                                These insights are informational only, not medical or financial advice.
                            </p>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
