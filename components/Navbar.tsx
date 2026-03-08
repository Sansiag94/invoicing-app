import React from "react";

export default function Navbar() {
  return (
    <header
      style={{
        height: 60,
        borderBottom: "1px solid #eaeaea",
        paddingLeft: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#fff",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 20 }}>Invoice SaaS</span>
      <span style={{ paddingRight: 20 }}>Logged in</span>
    </header>
  );
}
