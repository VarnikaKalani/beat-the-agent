# Beat-the-Agent

Beat-the-Agent is an interactive trading game where you try to outperform real reinforcement learning agents trained on historical market data. It’s built with Next.js, React, and precomputed TRPO/PPO trajectories exported from an RL training pipeline.

Play it live:  
https://beat-the-agent.vercel.app/

---

## What This Project Does

Beat-the-Agent turns a traditional backtest into a game.

You pick your portfolio allocations.  
The RL agents pick theirs.  
Everyone starts with the same capital.

As the simulation progresses, you’ll see:

- Your portfolio value over time  
- TRPO Agent performance  
- PPO Agent performance  
- Benchmarks like SPY, Equal-Weight, CVaR Min, Risk Parity, and Max Sharpe  
- Medals for the top three performers  
- A step-by-step monthly simulation  
- Allocation charts and a clean visual of who’s ahead  

---

## Key Features

### 1. Live Portfolio Simulation  
Adjust allocation sliders and watch your portfolio update using real historical monthly returns.

### 2. RL Agent Comparison  
Both TRPO and PPO use precomputed JSON trajectories.  
They update alongside you, making it a true “beat the agent” experience.

### 3. Built-In Benchmark Strategies  
All benchmarks are automatically rebased to \$1,000,000 for fair comparison:

- Buy & Hold SPY  
- Equal-Weight BH  
- CVaR Minimum  
- Risk Parity (Inverse Volatility)  
- Max Sharpe MVO  

### 4. Top-3 Strategy Chart  
The chart on the right always highlights the **top three performers** at the current timestep, with:

- Distinct colors  
- Auto-scaled Y axis  
- Clear X/Y labels  
- Smooth interpolation for readability  

### 5. One-Click Reset  
Resets the entire game:

- Allocations  
- Player portfolio  
- RL and benchmark curves  
- Charts and standings  

Everyone restarts at \$1,000,000.

---

## Tech Stack

- **Next.js 16** (App Router)  
- **React + TypeScript**  
- **Recharts** for visualization  
- **Supabase** (optional benchmark loading)  
- **TRPO / PPO JSON outputs** from a custom RL training pipeline  
- **Vercel** for deployment  

---

## Folder Structure

src/
app/
game/
page.tsx
AllocationChart.tsx
TopStrategiesChart.tsx
StandingsRow.tsx
useBenchmarks.ts
about/
page.tsx
layout.tsx
page.tsx
public/
trpo3.json
ppo_trajectory.json


---

## Running Locally

```bash
git clone https://github.com/VarnikaKalani/beat-the-agent
cd beat-the-agent
npm install
npm run dev
```
---

Visit: https://beat-the-agent.vercel.app/
---

## Contributors

This project was created and developed by:

- **Varnika Kalani** & **Parth Shah**

---

## License

This project is licensed under the **MIT License**.
