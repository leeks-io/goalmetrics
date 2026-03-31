'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, 
  Clock, 
  Activity, 
  ChevronRight, 
  RefreshCw,
  Search,
  Filter,
  AlertCircle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });

interface Match {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  time: string;
  status: string;
  odds: {
    home: string;
    draw: string;
    away: string;
  };
  prediction: string;
  confidence: number;
  explanation: string;
}

export default function MatchesView() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Fetch a list of major sports matches (Football, Basketball, etc.) happening today, ${today}. 
        Include: League Name, Home Team, Away Team, Match Time (UTC), Status (Upcoming/Live), and estimated Win/Draw/Loss odds.
        Also provide a 1-sentence AI prediction for each, a confidence score (0-100), and a brief explanation for the prediction.
        Return as a JSON array of objects with keys: id, league, homeTeam, awayTeam, time, status, odds (object with home, draw, away keys), prediction, confidence, explanation.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                league: { type: "string" },
                homeTeam: { type: "string" },
                awayTeam: { type: "string" },
                time: { type: "string" },
                status: { type: "string" },
                odds: {
                  type: "object",
                  properties: {
                    home: { type: "string" },
                    draw: { type: "string" },
                    away: { type: "string" }
                  }
                },
                prediction: { type: "string" },
                confidence: { type: "number" },
                explanation: { type: "string" }
              },
              required: ["id", "league", "homeTeam", "awayTeam", "time", "status", "odds", "prediction", "confidence", "explanation"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || "[]");
      setMatches(data);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('Failed to fetch real-time match data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const filteredMatches = matches.filter(m => 
    m.homeTeam.toLowerCase().includes(filter.toLowerCase()) ||
    m.awayTeam.toLowerCase().includes(filter.toLowerCase()) ||
    m.league.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* Header */}
      <div className="p-6 lg:p-8 border-b border-zinc-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tighter uppercase mb-1">Live Match Schedule</h2>
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Real-time data powered by Gemini Search</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Filter by team or league..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-emerald-500/50 transition-all w-full md:w-64"
            />
          </div>
          <button 
            onClick={fetchMatches}
            disabled={loading}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Scanning Global Sports Networks...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500/50" />
            <p className="text-zinc-400 max-w-xs">{error}</p>
            <button 
              onClick={fetchMatches}
              className="px-6 py-2 bg-emerald-500 text-black font-bold rounded-full text-xs hover:bg-emerald-400 transition-colors"
            >
              RETRY FETCH
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="pb-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">League</th>
                  <th className="pb-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Matchup</th>
                  <th className="pb-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Time (UTC)</th>
                  <th className="pb-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="pb-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center">Odds (H/D/A)</th>
                  <th className="pb-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">AI Insight</th>
                  <th className="pb-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredMatches.map((match) => (
                  <motion.tr 
                    key={match.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group hover:bg-zinc-900/30 transition-colors"
                  >
                    <td className="py-6 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="text-xs font-bold uppercase tracking-tight">{match.league}</span>
                      </div>
                    </td>
                    <td className="py-6 pr-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{match.homeTeam}</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">vs</span>
                        <span className="text-sm font-bold">{match.awayTeam}</span>
                      </div>
                    </td>
                    <td className="py-6 pr-4">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs font-mono">{match.time}</span>
                      </div>
                    </td>
                    <td className="py-6 pr-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        match.status.toLowerCase() === 'live' 
                          ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse' 
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {match.status}
                      </span>
                    </td>
                    <td className="py-6 pr-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-emerald-500">{match.odds.home}</div>
                        <div className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-zinc-500">{match.odds.draw}</div>
                        <div className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-emerald-500">{match.odds.away}</div>
                      </div>
                    </td>
                    <td className="py-6 pr-4 max-w-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-500 uppercase tracking-tight">
                            {match.prediction}
                          </span>
                          <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-bold text-emerald-500">
                            <Activity className="w-2.5 h-2.5" />
                            {match.confidence}% CONFIDENCE
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed italic border-l border-zinc-800 pl-3">
                          "{match.explanation}"
                        </p>
                      </div>
                    </td>
                    <td className="py-6 text-right">
                      <button className="p-2 hover:bg-emerald-500 hover:text-black rounded-lg transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            
            {filteredMatches.length === 0 && !loading && (
              <div className="py-24 text-center">
                <p className="text-zinc-500 text-sm uppercase tracking-widest">No matches found matching your filter.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-800/50 bg-black/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-emerald-500" />
          <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">Data Latency: ~2s • Source: Google Search Grounding</span>
        </div>
        <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
          Last Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
