import type { CreateAccountReq, CreateAccountRes, LoginReq } from "@vetply/shared";
import { createAccountResSchema, loginResSchema } from "@vetply/shared";
import { vetplyApiClient } from "./http-client";

export async function createAccount(
  body: CreateAccountReq,
): Promise<CreateAccountRes> {
  const { data } = await vetplyApiClient.post<unknown>(
    "/auth/account/create",
    body,
  );
  return createAccountResSchema.parse(data);
}

export async function login(body: LoginReq): Promise<CreateAccountRes> {
  const { data } = await vetplyApiClient.post<unknown>("/auth/login", body);
  return loginResSchema.parse(data);
}
