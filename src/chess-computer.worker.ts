import { chessComputerMove } from "./chess-computer";
self.onmessage = (event) => {
  try {
    self.postMessage({
      move: chessComputerMove(event.data.moves, event.data.difficulty),
    });
  } catch (error) {
    console.error("Chess computer search failed:", error);
    self.postMessage({
      error: "The computer could not choose a move. Please retry.",
    });
  }
};
