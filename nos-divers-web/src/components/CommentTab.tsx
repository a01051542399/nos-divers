import { useState, useRef, useEffect, useCallback } from "react";
import * as store from "../lib/supabase-store";
import { useToast } from "../toast";
import type { Comment } from "../types";

interface Props {
  tourId: number;
  currentUser?: string | null; // legacy, ignored — uses profile name
}

export function CommentTab({ tourId }: Props) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const { toast, confirm } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const list = await store.listComments(tourId);
    setComments(list);
  }, [tourId]);

  useEffect(() => {
    (async () => {
      const profile = await store.getProfile();
      setCurrentUser(profile.name || null);
      await refresh();
    })();
  }, [refresh]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleSend = async () => {
    if (!currentUser) { toast("설정에서 이름을 먼저 등록해주세요", "warning"); return; }
    if (!text.trim()) return;
    await store.addComment({ tourId, authorName: currentUser, text: text.trim() });
    setText("");
    await refresh();
  };

  const handleDelete = async (id: number) => {
    if (await confirm("삭제하시겠습니까?")) { await store.deleteComment(id); await refresh(); }
  };

  const handleEditStart = (id: number, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const handleEditSave = async () => {
    if (editingId === null || !editText.trim()) return;
    await store.editComment(editingId, editText.trim());
    setEditingId(null);
    setEditText("");
    await refresh();
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "방금";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간`;
    return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {!currentUser && (
        <div style={{
          background: "var(--warning-alpha)", borderRadius: 8,
          padding: "8px 12px", marginBottom: 10, fontSize: 12,
          color: "var(--warning)", textAlign: "center",
        }}>
          설정에서 이름을 등록하면 댓글을 작성할 수 있습니다
        </div>
      )}

      <div ref={scrollRef} style={{ maxHeight: 400, overflowY: "auto" }}>
        {comments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 13 }}>
            아직 댓글이 없습니다
          </div>
        ) : (
          comments.map((c) => {
            const isMine = c.authorName === currentUser;
            const isEditing = editingId === c.id;
            return (
              <div key={c.id} style={{
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)" }}>
                    {c.authorName}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>
                    {formatTime(c.createdAt)}
                  </span>
                  {(c as any).edited && (
                    <span style={{ color: "var(--muted)", fontSize: 10 }}>(수정됨)</span>
                  )}
                  {isMine && !isEditing && (
                    <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <button onClick={() => handleEditStart(c.id, c.text)} style={{
                        background: "none", border: "none", color: "var(--muted)",
                        fontSize: 11, cursor: "pointer", padding: 0,
                      }}>수정</button>
                      <button onClick={() => handleDelete(c.id)} style={{
                        background: "none", border: "none", color: "var(--error)",
                        fontSize: 11, cursor: "pointer", padding: 0,
                      }}>삭제</button>
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <input
                      className="input"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
                      style={{ flex: 1, padding: "6px 10px", fontSize: 13 }}
                      autoFocus
                    />
                    <button onClick={handleEditSave} style={{
                      background: "var(--primary)", color: "var(--on-primary)",
                      border: "none", borderRadius: 6, padding: "6px 10px",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>저장</button>
                    <button onClick={() => setEditingId(null)} style={{
                      background: "none", border: "1px solid var(--border)",
                      borderRadius: 6, padding: "6px 10px", color: "var(--muted)",
                      fontSize: 12, cursor: "pointer",
                    }}>취소</button>
                  </div>
                ) : (
                  <div style={{
                    fontSize: 13, lineHeight: 1.5, color: "var(--foreground)",
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {c.text}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div style={{
        display: "flex", gap: 6, marginTop: 10, alignItems: "center",
      }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={currentUser ? "댓글 입력..." : "설정에서 이름을 등록하세요"}
          disabled={!currentUser}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="input"
          style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
        />
        <button
          onClick={handleSend}
          disabled={!currentUser || !text.trim()}
          style={{
            background: currentUser && text.trim() ? "var(--primary)" : "var(--muted)",
            color: "var(--on-primary)", border: "none", borderRadius: 8,
            padding: "8px 14px", fontSize: 13, fontWeight: 600,
            cursor: currentUser && text.trim() ? "pointer" : "not-allowed",
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
}
