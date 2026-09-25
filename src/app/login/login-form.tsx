"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { fieldValue, initialActionState } from "@/lib/forms";

import { signIn, signUp } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [signInState, signInAction, signingIn] = useActionState(signIn, initialActionState);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, initialActionState);
  const state = signingUp || signUpState.message ? signUpState : signInState;
  const pending = signingIn || signingUp;

  return (
    <form className="grid gap-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <FormField id="email" label="이메일" error={state.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" defaultValue={fieldValue(state, "email")} required />
      </FormField>
      <FormField id="password" label="비밀번호" error={state.fieldErrors?.password} hint="8자 이상">
        <Input name="password" type="password" autoComplete="current-password" minLength={8} required />
      </FormField>
      {state.message ? (
        <p role="status" className={state.ok ? "text-sm" : "text-destructive text-sm"}>
          {state.message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button formAction={signInAction} disabled={pending} className="flex-1">
          로그인
        </Button>
        <Button formAction={signUpAction} disabled={pending} variant="outline" className="flex-1">
          회원가입
        </Button>
      </div>
    </form>
  );
}
