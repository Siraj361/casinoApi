// ✅ CLIENT EXAMPLE: Socket.io Integration for Casino Games

import io from "socket.io-client";

// ============================================
// 1️⃣ CONNECTION & INITIALIZATION
// ============================================

const socket = io("http://localhost:3000", {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

socket.on("connect", () => {
  console.log("✅ Connected to server:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error);
});

// ============================================
// 2️⃣ JOIN/LEAVE GAME ROOMS
// ============================================

function joinGame(gameCode, userId) {
  socket.emit("join_game", {
    gameCode,  // "DICE", "MINES", "CRASH"
    userId,    // Current user ID
  });
  console.log(`Joined game: ${gameCode}`);
}

function leaveGame(gameCode, userId) {
  socket.emit("leave_game", {
    gameCode,
    userId,
  });
  console.log(`Left game: ${gameCode}`);
}

// ============================================
// 3️⃣ KEEP-ALIVE HEARTBEAT
// ============================================

setInterval(() => {
  socket.emit("ping", (response) => {
    console.log("Server heartbeat:", response);
  });
}, 30000); // Every 30 seconds

// ============================================
// 4️⃣ LISTEN TO GAME RESULTS
// ============================================

// DICE Game Result
socket.on("dice_result", (data) => {
  console.log("🎲 Dice Result:", data);
  const {
    userId,
    roundId,
    betAmount,
    roll,
    chance,
    mode,
    won,
    payout,
    commission,
    balanceBefore,
    balanceAfter,
    timestamp,
  } = data;

  if (won) {
    console.log(`✅ Won! Payout: ${payout}, Commission: 0`);
  } else {
    console.log(`❌ Lost! Commission deducted: ${commission}`);
  }

  // Update UI with game result
  updateGameResultUI({
    result: won ? "WIN" : "LOSS",
    amount: payout,
    commission,
    newBalance: balanceAfter,
  });
});

// MINES Game Result
socket.on("mines_result", (data) => {
  console.log("⛏️ Mines Result:", data);
  const {
    userId,
    roundId,
    betAmount,
    won,
    payout,
    commission,
    hitTile,
    revealed,
    multiplier,
    timestamp,
  } = data;

  if (!won) {
    console.log(`❌ Hit a mine at tile ${hitTile}! Commission: ${commission}`);
  } else {
    console.log(`✅ Cashed out! Payout: ${payout} at multiplier ${multiplier}x`);
  }

  updateGameResultUI({
    result: won ? "CASHOUT" : "BUSTED",
    amount: payout || 0,
    commission,
    multiplier,
  });
});

// CRASH Game Result
socket.on("crash_result", (data) => {
  console.log("🚀 Crash Result:", data);
  const {
    userId,
    roundId,
    betAmount,
    won,
    crashPoint,
    cashoutAt,
    payout,
    commission,
    timestamp,
  } = data;

  if (!won) {
    console.log(
      `❌ Game crashed at ${crashPoint}x! Commission: ${commission}`
    );
  } else {
    console.log(`✅ Cashed out at ${cashoutAt}x! Payout: ${payout}`);
  }

  updateGameResultUI({
    result: won ? "CASHOUT" : "CRASHED",
    crashPoint,
    cashoutAt,
    amount: payout || 0,
    commission,
  });
});

// ============================================
// 5️⃣ LISTEN TO BALANCE UPDATES
// ============================================

socket.on("balance_updated", (data) => {
  console.log("💰 Balance Updated:", data);
  const { newBalance, change } = data;

  console.log(`New Balance: ${newBalance}`);
  console.log(`Change: ${change > 0 ? "+" : ""}${change}`);

  // Update UI wallet display
  updateWalletBalance(newBalance);
  showBalanceChangeAnimation(change);
});

// ============================================
// 6️⃣ DISCONNECT HANDLING
// ============================================

socket.on("disconnect", () => {
  console.log("❌ Disconnected from server");
  showNotification("Connection lost. Reconnecting...", "warning");
});

socket.on("reconnect", () => {
  console.log("✅ Reconnected to server");
  showNotification("Reconnected successfully!", "success");

  // Rejoin previous game
  const savedGameCode = localStorage.getItem("currentGame");
  const userId = getCurrentUserId();
  if (savedGameCode) {
    joinGame(savedGameCode, userId);
  }
});

// ============================================
// 7️⃣ REACT COMPONENT EXAMPLE
// ============================================

/*
import { useEffect, useState } from "react";
import { useSocket } from "./useSocket"; // Custom hook

export function DiceGame({ userId, currency }) {
  const [balance, setBalance] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Join game on mount
    socket.emit("join_game", { gameCode: "DICE", userId });

    // Listen for balance updates
    socket.on("balance_updated", (data) => {
      setBalance(data.newBalance);
    });

    // Listen for game results
    socket.on("dice_result", (data) => {
      setLastResult(data);
      setLoading(false);
    });

    return () => {
      socket.emit("leave_game", { gameCode: "DICE", userId });
    };
  }, [socket, userId]);

  const playDice = async (betAmount, chance, mode) => {
    setLoading(true);
    
    try {
      const response = await fetch("/api/games/dice/play", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          betAmount,
          chance,
          mode,
          currency_network_id: currency.id,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Error:", data.error);
        setLoading(false);
      }
      // Socket event will update UI automatically
    } catch (error) {
      console.error("Request error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="dice-game">
      <h2>Dice Game</h2>
      
      {/* Balance Display */}
      <div className="balance">
        Balance: {balance} {currency.symbol}
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className="result">
          <p>{lastResult.won ? "✅ WIN" : "❌ LOSS"}</p>
          <p>Payout: {lastResult.payout}</p>
          <p>Commission: {lastResult.commission}</p>
        </div>
      )}

      {/* Game Controls */}
      <button
        onClick={() => playDice(100, 50, "under")}
        disabled={loading}
      >
        {loading ? "Playing..." : "Play 100 (50%)"}
      </button>
    </div>
  );
}
*/

// ============================================
// 8️⃣ HELPER FUNCTIONS
// ============================================

function updateGameResultUI(result) {
  const resultEl = document.getElementById("game-result");
  if (resultEl) {
    resultEl.innerHTML = `
      <div class="result-card ${result.result.toLowerCase()}">
        <h3>${result.result}</h3>
        <p>Amount: ${result.amount}</p>
        ${result.commission ? `<p>Commission: ${result.commission}</p>` : ""}
        <p>New Balance: ${result.newBalance}</p>
      </div>
    `;
  }
}

function updateWalletBalance(balance) {
  const walletEl = document.getElementById("wallet-balance");
  if (walletEl) {
    walletEl.textContent = balance;
  }
}

function showBalanceChangeAnimation(change) {
  const animation = change > 0 ? "gain" : "loss";
  console.log(`💫 Balance change animation: ${animation}`);
  // Trigger CSS animation based on gain/loss
}

function showNotification(message, type) {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // Show toast/notification to user
}

function getCurrentUserId() {
  return localStorage.getItem("userId");
}

function getToken() {
  return localStorage.getItem("token");
}

// ============================================
// 9️⃣ EXPORT FOR USE
// ============================================

export {
  socket,
  joinGame,
  leaveGame,
};
