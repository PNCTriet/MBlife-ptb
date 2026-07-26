"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GradientPillButton } from "@/components/ipad/GradientPillButton";
import { IpadErrorBox, IpadInputBox } from "@/components/ipad/IpadInputBox";
import { IpadLayout } from "@/components/ipad/IpadLayout";
import { IpadScene } from "@/components/ipad/IpadScene";
import { findEmployeeByCode } from "@/lib/employees";
import { clearLiveState, fetchEmployees, presentEmployee } from "@/lib/live-data";
import type { Employee } from "@/lib/types";

type Screen = "welcome" | "input" | "error" | "success";
type Status = "idle" | "loading";

function errorLines(message: string): string[] {
  if (message.includes(". ")) {
    return message.split(". ").map((part, i, arr) =>
      i < arr.length - 1 ? `${part}.` : part.endsWith(".") ? part : `${part}.`
    );
  }
  return [message];
}

export default function InputPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [screen, setScreen] = useState<Screen>("welcome");
  const [status, setStatus] = useState<Status>("idle");
  const [query, setQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const presentingRef = useRef(false);

  useEffect(() => {
    fetchEmployees()
      .then((data) => setEmployees(data))
      .catch(() => {
        setScreen("error");
        setErrorMessage(
          "Không tải được danh sách nhân viên. Kiểm tra kết nối."
        );
      });
  }, []);

  useEffect(() => {
    if (screen === "input") {
      inputRef.current?.focus();
    }
  }, [screen]);

  const handleStart = () => {
    setScreen("input");
    setQuery("");
    setErrorMessage("");
  };

  const handleSubmit = useCallback(async () => {
    if (presentingRef.current || status === "loading") return;

    const match = findEmployeeByCode(employees, query);
    if (!match) {
      setScreen("error");
      setErrorMessage("Mã nhân viên không đúng. Vui lòng thử lại.");
      return;
    }

    presentingRef.current = true;
    setStatus("loading");

    try {
      await presentEmployee(match);
      setScreen("success");
    } catch (error) {
      setScreen("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gửi thất bại. Vui lòng thử lại."
      );
    } finally {
      presentingRef.current = false;
      setStatus("idle");
    }
  }, [employees, query, status]);

  const handleReturn = useCallback(async () => {
    if (presentingRef.current || status === "loading") return;

    presentingRef.current = true;
    setStatus("loading");

    try {
      await clearLiveState();
      setScreen("welcome");
      setQuery("");
      setErrorMessage("");
    } catch {
      setScreen("error");
      setErrorMessage("Không thể trả về màn chờ. Vui lòng thử lại.");
    } finally {
      presentingRef.current = false;
      setStatus("idle");
    }
  }, [status]);

  const handleRetryFromError = () => {
    setScreen("input");
    setErrorMessage("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <IpadLayout>
      {screen === "welcome" ? (
        <IpadScene
          variant="hero"
          footer={
            <GradientPillButton onClick={handleStart}>
              BẮT ĐẦU
            </GradientPillButton>
          }
        />
      ) : null}

      {screen === "input" ? (
        <IpadScene
          variant="compact"
          hint="Nhập mã nhân viên tại đây"
          main={
            <IpadInputBox
              value={query}
              onChange={(value) => {
                setQuery(value);
                if (errorMessage) setErrorMessage("");
              }}
              inputRef={inputRef}
            />
          }
          footer={
            <GradientPillButton
              onClick={handleSubmit}
              disabled={status === "loading" || !query.trim()}
            >
              {status === "loading" ? "ĐANG GỬI..." : "TIẾP THEO"}
            </GradientPillButton>
          }
        />
      ) : null}

      {screen === "error" ? (
        <IpadScene
          variant="compact"
          main={
            <IpadErrorBox
              lines={errorLines(errorMessage)}
              onRetry={handleRetryFromError}
            />
          }
          footer={
            <GradientPillButton onClick={handleRetryFromError}>
              TIẾP THEO
            </GradientPillButton>
          }
        />
      ) : null}

      {screen === "success" ? (
        <IpadScene
          variant="compact"
          mainKind="message"
          main="Nhập mã nhân viên thành công"
          footer={
            <GradientPillButton
              onClick={handleReturn}
              disabled={status === "loading"}
            >
              {status === "loading" ? "ĐANG XỬ LÝ..." : "QUAY LẠI"}
            </GradientPillButton>
          }
        />
      ) : null}
    </IpadLayout>
  );
}
