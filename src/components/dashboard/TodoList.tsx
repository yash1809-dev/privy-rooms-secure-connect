import { useState } from "react";
import { Plus, Trash2, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TodoTask } from "@/pages/Dashboard";
import { cn } from "@/lib/utils";

import { getActivityDays, calculateStreak, markTodayAsActive } from "@/lib/activity";

interface TodoListProps {
    todos: TodoTask[];
    setTodos: React.Dispatch<React.SetStateAction<TodoTask[]>>;
    onTaskComplete?: (xp: number) => void;
}

export function TodoList({ todos, setTodos, onTaskComplete }: TodoListProps) {
    const [newTask, setNewTask] = useState("");
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');

    const streak = calculateStreak();

    const xpRewards = {
        easy: 50,
        medium: 150,
        hard: 400
    };

    const addTodo = () => {
        if (newTask.trim()) {
            const newTodo: TodoTask = {
                id: Date.now().toString(),
                text: newTask.trim(),
                completed: false,
                createdAt: new Date().toISOString(),
                difficulty: difficulty
            };
            setTodos([...todos, newTodo]);
            setNewTask("");
            markTodayAsActive();
        }
    };

    const toggleTodo = (id: string) => {
        const todoToToggle = todos.find(t => t.id === id);
        const isNowCompleted = !todoToToggle?.completed;

        setTodos(todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ));

        if (isNowCompleted && todoToToggle) {
            const reward = xpRewards[todoToToggle.difficulty || 'easy'];
            onTaskComplete?.(reward);
        }

        markTodayAsActive();
    };

    const deleteTodo = (id: string) => {
        setTodos(todos.filter(todo => todo.id !== id));
    };

    const completedCount = todos.filter(t => t.completed).length;
    const totalCount = todos.length;

    return (
        <div className="space-y-6">
            {/* Header with Streak & Level Status */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                    <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">{streak} Day Streak</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded border border-white/5">
                        Missions: {completedCount}/{totalCount}
                    </div>
                </div>
            </div>

            {/* Add Task Input with Difficulty Selector */}
            <div className="space-y-3">
                <div className="flex gap-2 w-full">
                    <Input
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addTodo()}
                        placeholder="Define new mission..."
                        className="flex-1 min-w-0 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-600 focus:border-teal-500/50 transition-all font-mono text-xs sm:text-sm"
                    />
                    <Button onClick={addTodo} className="shrink-0 bg-teal-600 hover:bg-teal-500 text-white border-0 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                        <Plus className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Deploy</span>
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] mr-1 hidden sm:inline">Difficulty:</span>
                    {(['easy', 'medium', 'hard'] as const).map((d) => (
                        <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={cn(
                                "flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase transition-all border whitespace-nowrap",
                                difficulty === d
                                    ? d === 'easy' ? "bg-teal-500/20 border-teal-500 text-teal-400"
                                        : d === 'medium' ? "bg-indigo-500/20 border-indigo-500 text-indigo-400"
                                            : "bg-pink-500/20 border-pink-500 text-pink-400"
                                    : "bg-white/5 border-white/5 text-slate-500 hover:border-white/20"
                            )}
                        >
                            {d} <span className="hidden sm:inline">(+{xpRewards[d]} XP)</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Todo List - Gamified Cards */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {todos.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em]">No active missions.</p>
                    </div>
                ) : (
                    todos.map((todo) => (
                        <div
                            key={todo.id}
                            className={cn(
                                "relative group flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all duration-300",
                                todo.completed
                                    ? "bg-slate-900/40 border-white/5 opacity-60"
                                    : "bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900/80"
                            )}
                        >
                            <Checkbox
                                checked={todo.completed}
                                onCheckedChange={() => toggleTodo(todo.id)}
                                className="shrink-0 h-5 w-5 border-slate-700 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                            />

                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className={cn(
                                        "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border whitespace-nowrap",
                                        todo.difficulty === 'hard' ? "text-pink-400 border-pink-500/20 bg-pink-500/5"
                                            : todo.difficulty === 'medium' ? "text-indigo-400 border-indigo-500/20 bg-indigo-500/5"
                                                : "text-teal-400 border-teal-500/20 bg-teal-500/5"
                                    )}>
                                        {todo.difficulty || 'easy'} Mission
                                    </span>
                                </div>
                                <p className={cn(
                                    "text-sm font-medium transition-all truncate",
                                    todo.completed ? "line-through text-slate-500" : "text-white"
                                )}>
                                    {todo.text}
                                </p>
                            </div>

                            {!todo.completed && (
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-amber-500">+{xpRewards[todo.difficulty || 'easy']} XP</p>
                                </div>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteTodo(todo.id)}
                                className="h-8 w-8 text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
