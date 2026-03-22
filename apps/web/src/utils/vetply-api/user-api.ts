import type { UserGetMeRes } from "@vetply/shared";
import { userGetMeResSchema } from "@vetply/shared";
import { vetplyApiClient } from "./http-client";

export async function fetchUserGetMe(): Promise<UserGetMeRes> {
  const { data } = await vetplyApiClient.get<unknown>("/user/get-me");
  return userGetMeResSchema.parse(data);
}
