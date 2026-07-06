import { getSession } from "@/lib/auth";

export default async function DebugPage() {
  const session = await getSession();
  
  return (
    <div style={{ padding: "20px", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
      <h1>Session Debug</h1>
      {session ? (
        <>
          <p><strong>User ID:</strong> {session.id}</p>
          <p><strong>Name:</strong> {session.name}</p>
          <p><strong>Username:</strong> {session.username}</p>
          <p><strong>Role:</strong> {session.role}</p>
        </>
      ) : (
        <p>No session found</p>
      )}
    </div>
  );
}
