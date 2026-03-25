import { useState } from "react";
import * as store from "../store";
import { useToast } from "../toast";
import type { Route } from "../App";
import type { Tour } from "../types";

interface Props {
  tourId: number;
  navigate: (r: Route) => void;
}

type Tab = "participants" | "expenses" | "settlement";

export function TourDetailScreen({ tourId, navigate }: Props) {
  const [tour, setTour] = useState<Tour | undefined>(() => store.getTourById(tourId));
  const [activeTab, setActiveTab] = useState<Tab>("participants");
  const [newParticipantName, setNewParticipantName] = useState("");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const { toast } = useToast();
  const [expenseForm, setExpenseForm] = useState({
    name: "",
    amount: "",
    paidBy: 0,
    splitAmong: [] as number[],
  });

  const refresh = () => setTour(store.getTourById(tourId));

  if (!tour) {
    return (
      <div className="p-16 text-center text-muted" style={{ marginTop: 40 }}>
        투어를 찾을 수 없습니다
      </div>
    );
  }

  const settlements = store.calculateSettlement(tour);
  const totalExpenses = tour.expenses.reduce((sum, e) => sum + e.amount, 0);

  const requirePin = (action: () => void) => {
    setPendingAction(() => action);
    setPinValue("");
    setShowPinModal(true);
  };

  const verifyPin = () => {
    if (pinValue === "2399") {
      setShowPinModal(false);
      pendingAction?.();
    } else {
      toast("PIN이 올바르지 않습니다", "error");
    }
  };

  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) return;
    store.addParticipant(tourId, newParticipantName.trim());
    setNewParticipantName("");
    refresh();
  };

  const handleAddExpense = () => {
    if (!expenseForm.name || !expenseForm.amount || !expenseForm.paidBy) {
      toast("필수 항목을 모두 입력해주세요", "warning");
      return;
    }
    const splitAmong =
      expenseForm.splitAmong.length > 0
        ? expenseForm.splitAmong
        : tour.participants.map((p) => p.id);

    store.addExpense({
      tourId,
      name: expenseForm.name,
      amount: Number(expenseForm.amount),
      paidBy: expenseForm.paidBy,
      splitAmong,
    });
    setExpenseForm({ name: "", amount: "", paidBy: 0, splitAmong: [] });
    setShowExpenseForm(false);
    refresh();
    toast("항목이 추가되었습니다", "success");
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "participants", label: "참여자", icon: "👥" },
    { key: "expenses", label: "항목", icon: "💰" },
    { key: "settlement", label: "정산", icon: "↔" },
  ];

  return (
    <>
      {/* Top bar */}
      <div className="tour-header-bar">
        <button className="back-btn" onClick={() => navigate({ screen: "tours" })}>
          ← 뒤로
        </button>
        <div className="right-actions">
          <button className="tour-header-chip">
            👤 {tour.createdBy || "주최자"}
          </button>
          <button
            className="tour-header-chip"
            onClick={() => {
              const text = `NoS Divers 투어에 참가하세요!\n초대 코드: ${tour.inviteCode}`;
              navigator.clipboard.writeText(text);
              toast("초대 코드가 복사되었습니다!", "success");
            }}
          >
            ▶ 초대
          </button>
        </div>
      </div>

      {/* Tour Info Card (gradient) */}
      <div className="tour-info-card">
        <h2>{tour.name}</h2>
        <div className="meta">
          {tour.date && <span>📅 {tour.date}</span>}
          {tour.location && <span>📍 {tour.location}</span>}
        </div>
        <div className="access-code-box">
          <div className="access-code-label">입장 코드</div>
          <div className="access-code-value">{tour.accessCode}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`detail-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="scroll-content">
        {/* ── Participants ── */}
        {activeTab === "participants" && (
          <div>
            <div className="add-participant-bar">
              <input
                className="input"
                style={{ flex: 1 }}
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                placeholder="참가자 이름"
                onKeyDown={(e) => e.key === "Enter" && handleAddParticipant()}
              />
              <button className="add-participant-btn" onClick={handleAddParticipant}>
                + 참여자 추가
              </button>
            </div>

            {tour.participants.map((p) => (
              <div key={p.id} className="participant-item">
                <div className="participant-avatar">
                  {p.name.charAt(0)}
                </div>
                <span className="participant-name">{p.name}</span>
                <button
                  className="participant-delete"
                  onClick={() => {
                    store.removeParticipant(tourId, p.id);
                    refresh();
                  }}
                >
                  ✕
                </button>
              </div>
            ))}

            {tour.participants.length > 0 && (
              <div className="count-footer">총 {tour.participants.length}명</div>
            )}

            {tour.participants.length === 0 && (
              <div className="empty-state">
                <div className="icon">👥</div>
                <div>참여자를 추가해주세요</div>
              </div>
            )}
          </div>
        )}

        {/* ── Expenses ── */}
        {activeTab === "expenses" && (
          <div>
            <button
              className="btn btn-primary mb-16"
              onClick={() => setShowExpenseForm(true)}
            >
              + 항목 추가
            </button>

            {tour.expenses.length > 0 && (
              <div className="summary-card mb-16">
                <div className="summary-row">
                  <span>총 금액 (KRW)</span>
                  <span className="total-amount">₩{store.formatKRW(totalExpenses).replace("원","")}</span>
                </div>
                <div className="summary-row">
                  <span>항목 수</span>
                  <span className="summary-value">{tour.expenses.length}건</span>
                </div>
                <div className="summary-row">
                  <span>1인 평균</span>
                  <span className="summary-value">
                    ₩{tour.participants.length > 0
                      ? store.formatKRW(totalExpenses / tour.participants.length).replace("원","")
                      : "0"}
                  </span>
                </div>
              </div>
            )}

            {tour.expenses.map((e) => {
              const payer = tour.participants.find((p) => p.id === e.paidBy);
              const perPerson = e.splitAmong.length > 0 ? e.amount / e.splitAmong.length : 0;
              return (
                <div key={e.id} className="expense-item">
                  <div className="expense-header">
                    <div>
                      <div className="expense-category">{e.name}</div>
                    </div>
                    <div className="expense-amount">₩{store.formatKRW(e.amount).replace("원","")}</div>
                  </div>
                  <div className="expense-detail">
                    결제: {payer?.name || "?"}<br/>
                    분담: {e.splitAmong.length}명 (1인 ₩{store.formatKRW(perPerson).replace("원","")})
                  </div>
                  <div className="expense-actions">
                    <button
                      className="text-error"
                      onClick={() => {
                        store.removeExpense(tourId, e.id);
                        refresh();
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}

            {tour.expenses.length === 0 && (
              <div className="empty-state">
                <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
                <div>항목을 추가해주세요</div>
              </div>
            )}
          </div>
        )}

        {/* ── Settlement ── */}
        {activeTab === "settlement" && (
          <div>
            {/* Summary */}
            <div className="summary-card mb-16">
              <div className="summary-row">
                <span>참여자</span>
                <span className="summary-value">{tour.participants.length}명</span>
              </div>
              <div className="summary-row">
                <span>정산 건수</span>
                <span className="summary-value" style={{ color: "var(--primary)" }}>
                  {settlements.length}건
                </span>
              </div>
            </div>

            {settlements.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div>항목을 먼저 추가해주세요</div>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                  송금 내역
                </h3>
                {settlements.map((s, i) => (
                  <div key={i} className="settlement-card">
                    <div className="settlement-arrow">
                      <span className="settlement-label settlement-from">보냄</span>
                      <span style={{ color: "var(--muted)" }}>→</span>
                      <span className="settlement-label settlement-to">받음</span>
                    </div>
                    <div className="flex-row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 15 }}>
                        {s.fromName} → {s.toName}
                      </span>
                      <span className="settlement-amount">
                        ₩{store.formatKRW(s.amount).replace("원","")}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Per-person summary */}
                <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 24, marginBottom: 12 }}>
                  참여자별 요약
                </h3>
                {tour.participants.map((p) => {
                  const paid = tour.expenses
                    .filter((e) => e.paidBy === p.id)
                    .reduce((sum, e) => sum + e.amount, 0);
                  const owed = tour.expenses
                    .filter((e) => e.splitAmong.includes(p.id))
                    .reduce((sum, e) => sum + e.amount / e.splitAmong.length, 0);
                  const balance = paid - owed;
                  return (
                    <div key={p.id} className="settlement-card">
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>
                        결제: ₩{store.formatKRW(paid).replace("원","")} / 부담: ₩{store.formatKRW(owed).replace("원","")}
                      </div>
                      <div
                        style={{
                          textAlign: "right",
                          fontSize: 18,
                          fontWeight: 800,
                          color: balance >= 0 ? "var(--success)" : "var(--error)",
                        }}
                      >
                        {balance >= 0 ? "+" : ""}₩{store.formatKRW(Math.abs(balance)).replace("원","")}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div className="modal-overlay" onClick={() => setShowExpenseForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">항목 추가</div>

            <div className="input-group">
              <div className="input-label">항목 이름 *</div>
              <input
                className="input"
                value={expenseForm.name}
                onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                placeholder="예: 보트비, 숙박비, 식비"
              />
            </div>

            <div className="input-group">
              <div className="input-label">총 금액 (₩) *</div>
              <input
                className="input"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    amount: e.target.value.replace(/[^0-9]/g, ""),
                  })
                }
                placeholder="예: 300000"
                inputMode="numeric"
              />
            </div>

            <div className="input-label mb-8">결제자 *</div>
            <div className="flex-row flex-wrap gap-8 mb-16">
              {tour.participants.map((p) => (
                <button
                  key={p.id}
                  className={`chip ${expenseForm.paidBy === p.id ? "selected" : ""}`}
                  onClick={() => setExpenseForm({ ...expenseForm, paidBy: p.id })}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div className="input-label mb-8">
              분담 대상 ({expenseForm.splitAmong.length || tour.participants.length}명)
            </div>
            <div className="flex-row flex-wrap gap-8 mb-16">
              {tour.participants.map((p) => {
                const selected = expenseForm.splitAmong.includes(p.id);
                return (
                  <button
                    key={p.id}
                    className={`chip ${selected ? "selected-green" : ""}`}
                    onClick={() => {
                      const next = selected
                        ? expenseForm.splitAmong.filter((x) => x !== p.id)
                        : [...expenseForm.splitAmong, p.id];
                      setExpenseForm({ ...expenseForm, splitAmong: next });
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
              <button
                className="chip"
                style={{ fontSize: 12 }}
                onClick={() => setExpenseForm({ ...expenseForm, splitAmong: tour.participants.map(p => p.id) })}
              >
                ✓ 모두선택
              </button>
            </div>

            <div className="flex-row gap-12">
              <button className="btn btn-secondary" onClick={() => setShowExpenseForm(false)}>
                취소
              </button>
              <button className="btn btn-primary" onClick={handleAddExpense}>
                항목 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      {showPinModal && (
        <div className="modal-overlay modal-center" onClick={() => setShowPinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title" style={{ textAlign: "center" }}>PIN 입력</div>
            <input
              className="pin-input"
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              placeholder="----"
              type="password"
              maxLength={4}
              inputMode="numeric"
            />
            <div className="flex-row gap-12">
              <button className="btn btn-secondary" onClick={() => setShowPinModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={verifyPin}>확인</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
