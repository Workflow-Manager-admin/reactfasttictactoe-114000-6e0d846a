import React, { useState, useEffect } from 'react';
import './App.css';

/**
 * Color Scheme:
 * primary:   #1976d2 (blue)
 * secondary: #424242 (dark gray)
 * accent:    #ffca28 (amber)
 */

/* BOARD_SIZE and players */
const BOARD_SIZE = 3;
const PLAYER_X = 'X';
const PLAYER_O = 'O';

/**
 * Returns the winner ("X" or "O") or "tie" or null for in-progress.
 * @param {Array} board 3x3 game board array
 * @returns 'X' | 'O' | 'tie' | null
 */
function calculateWinner(board) {
  // Rows, cols, diagonals
  for (let i = 0; i < BOARD_SIZE; i++) {
    // Rows
    if (
      board[i][0] &&
      board[i][0] === board[i][1] &&
      board[i][1] === board[i][2]
    )
      return board[i][0];
    // Cols
    if (
      board[0][i] &&
      board[0][i] === board[1][i] &&
      board[1][i] === board[2][i]
    )
      return board[0][i];
  }
  // Diagonals
  if (
    board[0][0] &&
    board[0][0] === board[1][1] &&
    board[1][1] === board[2][2]
  )
    return board[0][0];
  if (
    board[0][2] &&
    board[0][2] === board[1][1] &&
    board[1][1] === board[2][0]
  )
    return board[0][2];

  // Tie?
  if (board.flat().every(cell => cell)) return 'tie';

  // In progress
  return null;
}

/**
 * Square component - Individual cell of the board
 */
function Square({ value, onClick, disabled }) {
  return (
    <button
      className="ttt-square"
      onClick={onClick}
      disabled={disabled || value !== ''}
      aria-label={value ? `Cell ${value}` : 'Empty cell'}
      tabIndex={0}
      style={{
        color: value === PLAYER_X ? 'var(--ttt-primary)' : value === PLAYER_O ? 'var(--ttt-accent)' : 'inherit'
      }}
    >
      {value}
    </button>
  );
}

/**
 * Board component - 3x3 grid
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

/**
 * StatusBar - Show game status, whose turn, win, or tie
 */
function StatusBar({ status, currentPlayer, winner }) {
  let content;
  if (status === 'win') {
    content = (
      <span>
        <span className="ttt-winner">{winner}</span> wins! 🎉
      </span>
    );
  } else if (status === 'tie') {
    content = <span>It's a <span className="ttt-tie">tie</span>! 🤝</span>;
  } else {
    content = (
      <span>
        Next turn: <span className={currentPlayer === PLAYER_X ? 'ttt-x' : 'ttt-o'}>{currentPlayer}</span>
      </span>
    );
  }
  return <div className="ttt-status">{content}</div>;
}

// PUBLIC_INTERFACE
function App() {
  // Theme handling (light/dark)
  const [theme, setTheme] = useState('light');

  // Game state
  const [board, setBoard] = useState(
    Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill(''))
  );
  const [currentPlayer, setCurrentPlayer] = useState(PLAYER_X);
  const [status, setStatus] = useState('in_progress'); // 'in_progress' | 'win' | 'tie'
  const [winner, setWinner] = useState(null);

  // Effect: Sync document theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Handle cell click
  // PUBLIC_INTERFACE
  const handleCellClick = (row, col) => {
    if (board[row][col] || status !== 'in_progress') return;
    // Copy board
    const updated = board.map((r, i) => (i === row ? r.slice() : r));
    updated[row][col] = currentPlayer;
    // Calculate status
    const result = calculateWinner(updated);

    setBoard(updated);
    if (result === PLAYER_X || result === PLAYER_O) {
      setStatus('win');
      setWinner(result);
    } else if (result === 'tie') {
      setStatus('tie');
      setWinner(null);
    } else {
      setCurrentPlayer(currentPlayer === PLAYER_X ? PLAYER_O : PLAYER_X);
    }
  };

  // Restart game
  // PUBLIC_INTERFACE
  const handleRestart = () => {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill('')));
    setCurrentPlayer(PLAYER_X);
    setStatus('in_progress');
    setWinner(null);
  };

  // Minimalistic, modern responsive UI, board centered, use color variables
  return (
    <div className="App" style={{ minHeight: '100vh' }}>
      <header className="App-header">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>

        <div className="ttt-container">
          <h1 className="ttt-title">Tic Tac Toe</h1>
          <StatusBar status={status} currentPlayer={currentPlayer} winner={winner} />
          <Board board={board} onCellClick={handleCellClick} isFinished={status !== 'in_progress'} />

          <button
            className="ttt-restart"
            onClick={handleRestart}
            aria-label="Restart game"
            tabIndex={0}
          >
            Restart
          </button>
        </div>

        <footer className="ttt-footer">
          <small>Modern React Tic Tac Toe &middot; Minimal UI</small>
        </footer>
      </header>
    </div>
  );
}

export default App;
