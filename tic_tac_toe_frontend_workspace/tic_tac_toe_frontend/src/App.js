import React, { useState, useEffect } from "react";
import "./App.css";

/**
 * API BASE URL
 * Adjust for deployment if needed. Assumes backend runs on localhost:3001 for dev.
 */
const API_BASE =
  process.env.REACT_APP_API_URL ||
  "http://localhost:3001"; // fallback for local dev

const BOARD_SIZE = 3;
const PLAYER_X = "X";
const PLAYER_O = "O";

/** Helper: fetch wrapper with error catch */
async function apiRequest(path, { method = "GET", body = undefined } = {}) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, options);

  // FastAPI returns 400 JSON for game errors (per contract)
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("Failed to parse server response.");
  }
  if (!res.ok) {
    const msg = json.detail || json.message || "API error";
    throw new Error(msg);
  }
  return json;
}

/**
 * Square - single cell
 */
function Square({ value, onClick, disabled }) {
  return (
    <button
      className="ttt-square"
      onClick={onClick}
      disabled={disabled || value !== ""}
      aria-label={value ? `Cell ${value}` : "Empty cell"}
      tabIndex={0}
      style={{
        color:
          value === PLAYER_X
            ? "var(--ttt-primary)"
            : value === PLAYER_O
            ? "var(--ttt-accent)"
            : "inherit",
      }}
    >
      {value}
    </button>
  );
}

/**
 * Board (3x3 grid)
 */
function Board({ board, onCellClick, isFinished }) {
  return (
    <div className="ttt-board">
      {board.map((row, rowIdx) =>
        row.map((val, colIdx) => (
          <Square
            key={`${rowIdx}-${colIdx}`}
            value={val}
            onClick={() => onCellClick(rowIdx, colIdx)}
            disabled={isFinished}
          />
        ))
      )}
    </div>
  );
}

/** Status bar */
function StatusBar({ status, currentPlayer, winner, errorMessage }) {
  let content;
  if (errorMessage) {
    // Show error as prominent alert
    content = (
      <span style={{ color: "#c0392b", fontWeight: 600 }}>{errorMessage}</span>
    );
  } else if (status === "win") {
    content = (
      <span>
        <span className="ttt-winner">{winner}</span> wins! 🎉
      </span>
    );
  } else if (status === "tie") {
    content = (
      <span>
        It's a <span className="ttt-tie">tie</span>! 🤝
      </span>
    );
  } else {
    content = (
      <span>
        Next turn:{" "}
        <span className={currentPlayer === PLAYER_X ? "ttt-x" : "ttt-o"}>
          {currentPlayer}
        </span>
      </span>
    );
  }
  return <div className="ttt-status">{content}</div>;
}

// PUBLIC_INTERFACE
function App() {
  // Theme handling
  const [theme, setTheme] = useState("light");

  // Backend-sourced game state (board, currentPlayer, status, winner, move_count)
  const [board, setBoard] = useState(
    Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill(""))
  );
  const [currentPlayer, setCurrentPlayer] = useState(PLAYER_X);
  const [status, setStatus] = useState("in_progress"); // in_progress | win | tie
  const [winner, setWinner] = useState(null);

  // Async UI state
  const [isLoading, setIsLoading] = useState(true); // for full app load
  const [isSubmitting, setIsSubmitting] = useState(false); // for move
  const [errorMessage, setErrorMessage] = useState(null);

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Fetch game state from backend
  const fetchGameState = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiRequest("/game/state");
      updateFrontendStateFromBackend(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // On first mount, fetch state from backend
  useEffect(() => {
    fetchGameState();
    // eslint-disable-next-line
  }, []);

  // Helper to copy backend state to frontend
  function updateFrontendStateFromBackend(data) {
    if (!data || !Array.isArray(data.board)) {
      setErrorMessage("Malformed backend response.");
      return;
    }
    setBoard(data.board);
    setCurrentPlayer(data.current_player);
    setStatus(data.status);
    setWinner(data.winner || null);
  }

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Click handler for cell
  // PUBLIC_INTERFACE
  const handleCellClick = async (row, col) => {
    if (isSubmitting || status !== "in_progress" || board[row][col] !== "") return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // POST move
      const data = await apiRequest("/game/move", {
        method: "POST",
        body: { row, col },
      });
      updateFrontendStateFromBackend(data);
    } catch (err) {
      setErrorMessage(err.message);
      // Optionally: Refresh state in case game desyncs
      setTimeout(fetchGameState, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restart - POST to /game/start, then GET state (or use response)
  // PUBLIC_INTERFACE
  const handleRestart = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiRequest("/game/start", {
        method: "POST",
        body: {},
      });
      updateFrontendStateFromBackend(data);
    } catch (err) {
      setErrorMessage("Could not restart: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Allow pressing "Enter" on Restart button for accessibility
  const handleRestartKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      handleRestart();
    }
  };

  // Loading Spinner skeleton
  function Spinner() {
    return (
      <div style={{ margin: "32px", textAlign: "center" }}>
        <svg width="36" height="36" style={{ opacity: 0.7 }}>
          <circle
            cx="18"
            cy="18"
            r="16"
            stroke="#1976d2"
            strokeWidth="4"
            fill="none"
            strokeDasharray="100"
            strokeDashoffset="45"
            strokeLinecap="round"
            style={{
              animation: "spinner-rot .9s linear infinite",
            }}
          />
          <style>
            {`@keyframes spinner-rot { 100% { transform: rotate(360deg); } }`}
          </style>
        </svg>
        <div style={{ color: "#888", fontSize: "1.09rem", marginTop: "12px" }}>
          Loading game...
        </div>
      </div>
    );
  }

  // Minimalistic, modern responsive UI, board centered, themed
  return (
    <div className="App" style={{ minHeight: "100vh" }}>
      <header className="App-header">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>

        <div className="ttt-container">
          <h1 className="ttt-title">Tic Tac Toe</h1>
          <StatusBar
            status={status}
            currentPlayer={currentPlayer}
            winner={winner}
            errorMessage={errorMessage}
          />
          {isLoading ? (
            <Spinner />
          ) : (
            <Board
              board={board}
              onCellClick={handleCellClick}
              isFinished={status !== "in_progress" || isSubmitting}
            />
          )}

          <button
            className="ttt-restart"
            onClick={handleRestart}
            onKeyDown={handleRestartKey}
            aria-label="Restart game"
            tabIndex={0}
            disabled={isLoading}
            style={{ opacity: isLoading ? 0.45 : 1 }}
          >
            Restart
          </button>
        </div>

        <footer className="ttt-footer">
          <small>Modern React Tic Tac Toe &middot; Minimal UI &middot; Synced with FastAPI backend</small>
        </footer>
      </header>
    </div>
  );
}

export default App;
