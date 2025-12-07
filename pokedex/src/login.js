import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

const Login = ({ onLogin }) => {
  const [error, setError] = useState("");

  const parseJwt = (token) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (err) {
      console.error("Error parsing JWT:", err);
      return null;
    }
  };

  const handleSuccess = (credentialResponse) => {
    try {
      const decoded = parseJwt(credentialResponse.credential);
      if (decoded) {
        onLogin(decoded);
        setError("");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to login. Please try again.");
    }
  };

  const handleError = () => {
    setError("Login failed. Please try again.");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome to Pokédex!</h2>
        <p>Sign in with Google to explore Pokémon</p>
        {error && <div className="login-error">{error}</div>}
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          text="signin_with"
          size="large"
        />
      </div>
    </div>
  );
};

export default Login;
