from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Literal

# Game Constants
PLAYER_X = "X"
PLAYER_O = "O"
EMPTY = ""
BOARD_SIZE = 3

# In-memory global game state
class TicTacToeGame:
    def __init__(self):
        self.reset_game()

    # PUBLIC_INTERFACE
    def reset_game(self):
        """Reset the game to initial state."""
        self.board = [[EMPTY for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
        self.current_player = PLAYER_X
        self.status = "in_progress"  # in_progress, win, tie
        self.winner = None
        self.move_count = 0

    # PUBLIC_INTERFACE
    def get_state(self):
        """Get the current state of the game."""
        return {
            "board": self.board,
            "current_player": self.current_player,
            "status": self.status,
            "winner": self.winner,
            "move_count": self.move_count
        }

    # PUBLIC_INTERFACE
    def make_move(self, row: int, col: int):
        """
        Make a move for the current player at (row, col).
        Raises HTTPException for invalid moves.
        """
        if self.status != "in_progress":
            raise HTTPException(status_code=400, detail="Game is over. Please restart.")

        if not (0 <= row < BOARD_SIZE and 0 <= col < BOARD_SIZE):
            raise HTTPException(status_code=400, detail="Move out of bounds.")

        if self.board[row][col] != EMPTY:
            raise HTTPException(status_code=400, detail="Cell already occupied.")

        self.board[row][col] = self.current_player
        self.move_count += 1

        winner_symbol = self.check_winner()
        if winner_symbol:
            self.status = "win"
            self.winner = winner_symbol
        elif self.move_count == BOARD_SIZE * BOARD_SIZE:
            self.status = "tie"
            self.winner = None
        else:
            self.current_player = PLAYER_O if self.current_player == PLAYER_X else PLAYER_X

        return self.get_state()

    def check_winner(self) -> Optional[str]:
        """Check for a winner. Return PLAYER_X, PLAYER_O or None."""
        lines = []

        # Rows and columns
        for i in range(BOARD_SIZE):
            lines.append(self.board[i])  # row
            lines.append([self.board[r][i] for r in range(BOARD_SIZE)])  # column

        # Diagonals
        lines.append([self.board[i][i] for i in range(BOARD_SIZE)])  # main diag
        lines.append([self.board[i][BOARD_SIZE - 1 - i] for i in range(BOARD_SIZE)])  # anti-diag

        for line in lines:
            if all(cell == PLAYER_X for cell in line):
                return PLAYER_X
            if all(cell == PLAYER_O for cell in line):
                return PLAYER_O
        return None

# Instantiate a global game instance (single game for MVP)
game = TicTacToeGame()

# ==== FASTAPI APP & CORS ====

app = FastAPI(
    title="Tic Tac Toe Backend API",
    version="1.0.0",
    description="Backend service providing game logic for Tic Tac Toe. CORS enabled for frontend integration.",
    openapi_tags=[
        {"name": "Game", "description": "Endpoints for starting, moving, and checking game state"}
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this as necessary for production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==== Pydantic Models ====

class StartGameRequest(BaseModel):
    # Placeholder for future optional config (e.g., first_player)
    pass

class MoveRequest(BaseModel):
    row: int = Field(..., ge=0, le=BOARD_SIZE-1, description="Row (0-based)")
    col: int = Field(..., ge=0, le=BOARD_SIZE-1, description="Column (0-based)")

class GameStateResponse(BaseModel):
    board: List[List[Literal["", "X", "O"]]] = Field(..., description="Current game board, 3x3")
    current_player: Literal["X", "O"]
    status: Literal["in_progress", "win", "tie"]
    winner: Optional[Literal["X", "O"]]
    move_count: int

# ==== ROUTES ====

# PUBLIC_INTERFACE
@app.post(
    "/game/start",
    response_model=GameStateResponse,
    summary="Start or reset the game",
    description="Resets the Tic Tac Toe game to its initial state.",
    tags=["Game"]
)
def start_game(_: StartGameRequest = None):
    """
    Reset the Tic Tac Toe game.

    Returns:
        GameStateResponse: The initial game state after reset.
    """
    game.reset_game()
    return game.get_state()

# PUBLIC_INTERFACE
@app.get(
    "/game/state",
    response_model=GameStateResponse,
    summary="Get current game state",
    description="Returns the current state of the game, including board, player, status, and winner.",
    tags=["Game"]
)
def get_game_state():
    """
    Get the current state of the game.

    Returns:
        GameStateResponse: The game's current board, player, status, and winner.
    """
    return game.get_state()

# PUBLIC_INTERFACE
@app.post(
    "/game/move",
    response_model=GameStateResponse,
    summary="Make a player move",
    description="Records a move for the current player at the specified row and column. Switches player and updates game status.",
    tags=["Game"]
)
def make_move(req: MoveRequest):
    """
    Make a move for the current player at the given (row, col) position.

    Args:
        req (MoveRequest): Contains row and col.

    Returns:
        GameStateResponse: The updated game state.
    """
    # This route handles invalid moves and ends the game when appropriate.
    return game.make_move(req.row, req.col)

# PUBLIC_INTERFACE
@app.get(
    "/",
    summary="Health check",
    description="Check that the backend is running.",
    tags=["Game"]
)
def health_check():
    """Simple health check endpoint."""
    return {"message": "Healthy"}

# Entrypoint for Uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=3001, reload=True)
