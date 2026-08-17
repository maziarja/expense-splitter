import { describe, expect, it, vi } from "vitest";
import { removeUserMemberships } from "./remove";

function fakeClient() {
  const updateMany = vi.fn().mockResolvedValue({ count: 0 });
  return { client: { member: { updateMany } }, updateMany };
}

describe("removeUserMemberships", () => {
  it("soft-deletes every active membership for the user", async () => {
    const { client, updateMany } = fakeClient();

    await removeUserMemberships(client as never, "usr_1");

    expect(updateMany).toHaveBeenCalledTimes(1);
    const [{ where, data }] = updateMany.mock.calls[0];
    expect(where).toEqual({ userId: "usr_1", deletedAt: null });
    expect(data.deletedAt).toBeInstanceOf(Date);
  });
});
