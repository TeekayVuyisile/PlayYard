import type { GameId } from "./game-catalog";

type RuleGroup = { title: string; rules: string[] };
export type GameRules = {
  goal: string;
  steps: string[];
  example: string;
  more: RuleGroup[];
};

export const GAME_RULES: Record<GameId, GameRules> = {
  number: {
    goal: "Find the other player’s secret number before they find yours.",
    steps: [
      "Choose the smallest and biggest numbers for your game. Both players use this same range.",
      "Pick a whole number in that range. Press the lock button to keep it secret.",
      "Take turns guessing the other player’s number.",
      "Read the clue: Go higher means guess a bigger number. Go lower means guess a smaller number.",
      "Get the number exactly right to win!",
    ],
    example:
      "The secret is 8. You guess 5. Go higher! You guess 9 on your next turn. Go lower! Now try 8.",
    more: [
      {
        title: "Remember",
        rules: [
          "You may pick the smallest or biggest number too. For 0 to 10, both 0 and 10 are allowed.",
          "Use whole numbers, like 4 or 25. Do not use part of a number, like 4.5.",
          "Both players must lock their secret before anyone can guess. You cannot change a locked secret.",
          "A wrong guess ends your turn. The app gives the higher or lower clue for you.",
          "There is no turn timer. The game ends as soon as one player guesses correctly.",
          "Choose Play another round or Play again after the result to start with new secrets.",
        ],
      },
    ],
  },
  timer: {
    goal: "Stop your clock as close as you can to the target time.",
    steps: [
      "Look at the target. It might say 10 seconds.",
      "Press Start when you are ready. Your clock starts counting.",
      "Press Stop when you think you have reached the target.",
      "Wait for the other player to stop too.",
      "The player closest to the target wins!",
    ],
    example:
      "The target is 10 seconds. You stop at 9.9. Your friend stops at 10.3. You win: you are only 0.1 second away!",
    more: [
      {
        title: "Remember",
        rules: [
          "The room maker chooses a target from 1 to 30 seconds. Both players get the same target.",
          "You each start your own clock. You do not need to press Start together.",
          "Too early and too late count the same. At a 10-second target, 9 and 11 are both 1 second away.",
          "If you are both the same distance from the target, it is a draw. That means nobody wins.",
          "In hidden mode, the running numbers disappear. Count in your head!",
          "On a computer, you can press Space to start or stop. Space still works normally when typing or using another button.",
          "You get one submitted time each round. You cannot change it after stopping. A clock left running stops at 60 seconds.",
          "If a page refresh interrupts your clock, use Reset attempt to try that unfinished attempt again.",
          "Open Practice solo to play on your own. Try again as often as you like. Choose Play another round after a shared result to play together again.",
        ],
      },
    ],
  },
  answer: {
    goal: "Think of the same answer as your friend. You are a team!",
    steps: [
      "Read the question. For example: Name a fruit.",
      "Think of what your friend might say. Keep your answer secret for now.",
      "Type one answer. Press Lock in answer.",
      "When you have both answered, look at the two answers. A match earns your team 1 point.",
      "Both press Ready for next prompt to go on. Play 5 questions and see your team score!",
    ],
    example:
      "The question says Name a fruit. You write apple. Your friend writes apples. That is a match: 1 point together!",
    more: [
      {
        title: "Remember",
        rules: [
          "Do not tell each other your answers before the reveal. A reveal is when the app shows both answers.",
          "A locked answer cannot be changed. Keep it short: up to 60 letters, spaces and signs.",
          "Big and small letters match: Apple and APPLE count the same. Extra spaces do not matter. A dash or other punctuation mark acts like a space.",
          "Common word pairs match too: fork and forks, mouse and mice, colour and color, bike and bicycle.",
          "The app knows a set list of word pairs. It cannot understand every word that means the same thing. Typos and other wording may not match.",
          "Different things do not match: apple and banana earn no point. Fork and fox are also different.",
          "There is no answer timer. Wait for both answers, then both agree to the next question.",
          "After question 5, read the last answers first. Press See final score when you are ready. Your shared score is out of 5.",
          "Both choose Play another match to get new questions. In the same room, the 120 questions are used before they repeat.",
        ],
      },
    ],
  },
  imposter: {
    goal: "Find the one player who does not know the secret word. Or, if that player is you, blend in!",
    steps: [
      "Get 3 to 8 players. The room maker picks words or drawing, and 1 to 5 clue rounds.",
      "Look at your secret role. Most players see the same word. One player is the imposter and sees no word.",
      "Take turns giving one clue. A round means everyone gets one turn.",
      "Watch and listen. Who seems unsure about the word?",
      "After the last clue round, everyone votes once. Pick the player you think is the imposter.",
    ],
    example:
      "The secret word is pizza. One player says cheesy. Another says round. A player who says snowy might not know the word!",
    more: [
      {
        title: "Words mode",
        rules: [
          "Describe the word without saying or typing the word itself. Do not tell anyone your secret role.",
          "Type a short clue, or say it using voice or in the room. If you speak, press the button to mark your spoken clue as done.",
          "A typed clue can have up to 120 letters, spaces and signs.",
          "If you are the imposter, use what you hear to give a clue that fits. You do not get a different secret word.",
        ],
      },
      {
        title: "Drawing mode",
        rules: [
          "Everyone adds to the same picture. On your turn, draw one line that fits the secret word.",
          "Keep your finger or pen down, or keep the mouse button pressed. When you lift or let go, your turn ends.",
          "You cannot erase or undo a line. Do not write the secret word.",
          "Your finished line is added to the shared picture. Then the next person draws.",
        ],
      },
      {
        title: "Voting and winning",
        rules: [
          "There is only one vote stage in a game, even if you play several clue rounds.",
          "Vote for someone else. You cannot vote for yourself or change a locked vote.",
          "Wait until everyone has voted. The player with the most votes is the group’s choice.",
          "If that one player is the imposter, the other players win together.",
          "If you choose the wrong player, the imposter wins right away. If two or more players tie for the most votes, the imposter also wins.",
          "If a clue turn gets stuck, the room maker can skip it after 60 seconds.",
          "After the result, the room maker can start a new game with a new secret word and a new random imposter.",
        ],
      },
    ],
  },
  chess: {
    goal: "Trap the other king so it cannot escape. This is called checkmate.",
    steps: [
      "You play with the white pieces or the black pieces. White moves first.",
      "Tap one of your pieces. The marked squares show where it can go.",
      "Tap a marked square to move there. Then it is the other player’s turn.",
      "Land on an enemy piece to take it off the board. Your king must always stay safe.",
      "Attack the other king and leave it no safe move or other escape. Checkmate: you win!",
    ],
    example:
      "Tap your knight. Its moves make an L: two squares one way, then one square to the side. Tap a marked square to move it.",
    more: [
      {
        title: "How each piece moves",
        rules: [
          "Pawn: move forward 1 empty square. On its very first move, it may go forward 2 empty squares. It takes an enemy piece 1 square diagonally forward. It cannot move backward.",
          "Rook: move any number of clear squares in a straight line, up, down or sideways.",
          "Bishop: move any number of clear squares diagonally. That means along a slanted line.",
          "Queen: move any number of clear squares straight or diagonally.",
          "Knight: move in an L shape: 2 squares one way and 1 to the side. It is the only piece that can jump over other pieces.",
          "King: move 1 square in any direction, but never onto a square an enemy can attack.",
          "You cannot land on your own piece. Apart from the knight, pieces cannot jump over other pieces.",
        ],
      },
      {
        title: "Keeping your king safe",
        rules: [
          "Check means an enemy is attacking your king. On your next move, you must make your king safe.",
          "You can escape by moving the king, taking the attacking piece, or blocking the attack. Not every escape works in every position.",
          "If you are in check and there is no safe move, it is checkmate. The game ends. You do not take the king off the board.",
          "The app only lets you make legal moves. That means moves allowed by the rules.",
        ],
      },
      {
        title: "Three special moves",
        rules: [
          "Promotion: when your pawn reaches the far end of the board, choose a queen, rook, bishop or knight to replace it.",
          "Castling: move your king 2 squares toward a rook. The app moves the rook too. Neither piece may have moved before, and all squares between them must be empty. Your king must not start in check or cross or land on an attacked square.",
          "En passant: if an enemy pawn moves forward 2 squares and lands right beside your pawn, you may take it as if it moved only 1 square. You must do this on your very next turn, or the chance is gone.",
        ],
      },
      {
        title: "Draws, giving up and playing again",
        rules: [
          "A draw means nobody wins. Stalemate is a draw: a player is not in check but has no legal move.",
          "The app calls a draw if the same position repeats 3 times. It must be the same player’s turn, with the same special moves still allowed.",
          "It is also a draw if too few pieces remain for a possible checkmate, or if each player makes 50 moves without moving a pawn or taking a piece.",
          "You may offer a draw. The other player can accept, decline, or keep playing. The computer accepts draw offers.",
          "Resign means give up this game. Press Resign, then Confirm resignation. The other player wins.",
          "There is no chess clock. Take your time. After a result, both players agree to a rematch and switch colours.",
        ],
      },
    ],
  },
  prism: {
    goal: "Find the other player’s secret colour order before they find yours.",
    steps: [
      "You each have 4 crystals: blue, green, red and yellow. Each colour is used once.",
      "Put yours in a secret order. Tap two crystals to swap their places. Press Seal secret code.",
      "Once both secrets are sealed, take turns guessing the other player’s order.",
      "Make a guess by swapping crystals, then press Submit arrangement. The clue tells you how many are in the right place.",
      "Get all 4 places right to win!",
    ],
    example:
      "The secret is blue, green, red, yellow. You guess blue, green, yellow, red. You get 2 out of 4 right. The app tells you the number, not which two!",
    more: [
      {
        title: "Remember",
        rules: [
          "Each guess must use all 4 colours exactly once. B means blue, G means green, R means red and Y means yellow.",
          "Your secret cannot change after you seal it. The other player cannot see it until the game ends.",
          "The clue counts only colours in the correct place. A colour in the wrong place earns nothing.",
          "You cannot submit the same guess twice in one game. Look at the decoding log to remember your clues.",
          "There is no turn timer. The first exact guess ends the game right away.",
          "Both players agree to play again after the result. Then the starting player switches and you each set a new secret.",
        ],
      },
    ],
  },
  poison: {
    goal: "Keep your hearts! Make the other player find all 3 poison bites first.",
    steps: [
      "You each get your own tray of 10 bites and 3 hearts.",
      "Secretly tap 3 different bites on the other player’s tray. These are your poison traps. Lock them in.",
      "When both players are ready, take turns picking 1 bite from your own tray.",
      "A safe bite keeps your hearts. A poison bite takes away 1 heart.",
      "The first player to lose all 3 hearts loses. The other player wins!",
    ],
    example:
      "You have 3 hearts. You pick bite 4 and it has poison. Now you have 2 hearts. Your friend picks next.",
    more: [
      {
        title: "Remember",
        rules: [
          "This is pretend food and pretend poison. You only tap the bites on the screen.",
          "Choose exactly 3 different traps before locking them. You cannot change locked traps.",
          "The traps you set are on your opponent’s tray, not yours. They choose the hidden traps on your tray.",
          "Every pick ends your turn, whether it is safe or poison. You cannot pick the same bite twice.",
          "You cannot see the poison hidden on your tray until you pick it or the game ends.",
          "There is no turn timer. After the result, both choose to play again. The starting player switches and you set new traps.",
        ],
      },
    ],
  },
  memory: {
    goal: "Remember the colour pattern. Get more points than your friend after 5 rounds.",
    steps: [
      "Both press Ready to remember. Watch the countdown.",
      "Look carefully at the crystals. You have 3 seconds to remember their order.",
      "The pattern disappears. Tap a place, then tap the colour that belongs there.",
      "Fill every place and press Lock my memory. Keep your answer secret until both players finish.",
      "Get 1 point for each colour in the right place. Play 5 rounds. The biggest total wins!",
    ],
    example:
      "The pattern starts blue, red, blue, green. You remember blue, red, yellow, green. You get 3 points: places 1, 2 and 4 are right.",
    more: [
      {
        title: "Remember",
        rules: [
          "Both players see the same pattern. Colours can repeat. You may need blue more than once!",
          "Round 1 has 4 places. Each new round adds 1 place, up to 8 in round 5. You still get 3 seconds to look.",
          "You can change your choices before locking them. A locked answer cannot be changed.",
          "Once the pattern is hidden, there is no timer for filling in your answer. Both must finish before the reveal.",
          "Both press Ready for round to move on after reading the answers.",
          "Add your points from all 5 rounds. If both totals are the same, it is a draw: nobody wins.",
          "Both players must agree to a new match after the result. You get fresh patterns and your points start at 0.",
        ],
      },
    ],
  },
  fuse: {
    goal: "Do not be holding the bomb when its clock runs out. Be the last player with a life left!",
    steps: [
      "Get 2 to 8 players. Everyone starts with 3 lives. The room maker starts the match.",
      "The app gives the bomb to a random player. Watch its countdown.",
      "If you hold it, wait until Pass now appears. Tap another player’s name to pass it.",
      "When the clock reaches 0, the player holding the bomb loses 1 life.",
      "Keep playing. If you lose all 3 lives, you are out. The last player left wins!",
    ],
    example:
      "You hold the bomb with 2 seconds left. Pass it to Sam. If the clock reaches 0 while Sam still holds it, Sam loses 1 life.",
    more: [
      {
        title: "Remember",
        rules: [
          "This is a pretend bomb in the game. You only pass it on the screen.",
          "Each new bomb gets a random time from 10 to 20 seconds. Passing it does not add time or restart the clock.",
          "Only the holder can pass. You must hold it for at least 0.3 second before passing. The app shows you when you can pass.",
          "Pass to any player who still has a life. You cannot pass to yourself or someone who is out.",
          "After a boom, there is a 4-second break. Then a new bomb starts by itself and goes to a random player who is still in.",
          "The game keeps counting if someone disconnects. Your pass must reach the game before time runs out.",
          "Players who are out can stay and watch. After the winner is shown, the room maker can start a fresh match. Everyone gets 3 lives again.",
        ],
      },
    ],
  },
};

export const PRACTICE_RULES: GameRules = {
  goal: "Practise stopping close to your target. Try to beat your own best time!",
  steps: [
    "Choose a target from 1 to 30 seconds.",
    "Press Start practice timer when you are ready.",
    "Press Stop when you think you have reached the target.",
    "Read how far away you were. A smaller gap is better.",
    "Try again! You do not need another player.",
  ],
  example:
    "Your target is 5 seconds. You stop at 5.2. Your gap is 0.2 second. Try to make that gap smaller next time!",
  more: [
    {
      title: "Practice tips",
      rules: [
        "Turn on hidden mode to count in your head instead of watching the numbers.",
        "On a computer, press Space to start or stop. Space still works normally in a text box or on another button.",
        "You cannot change the target or hidden mode while a clock is running. An attempt stops at 60 seconds if you leave it running.",
        "Your last 10 attempts are shown on this page. The best gap comes from that list; changing targets can change how hard a try is.",
        "Refreshing or leaving clears your practice attempts. Choose Play with friends to open a shared room.",
      ],
    },
  ],
};
