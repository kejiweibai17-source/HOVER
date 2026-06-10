"use client";

import {
  AnimatePresence,
  motion,
  useAnimate,
  usePresence,
} from "framer-motion";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const FavoriteSpots = ({ spots, setSpots }) => {
  const router = useRouter();
  const [allSpots] = useState([
    {
      id: 1,
      name: "九份老街",
      estimatedTime: "1 小時",
      image: "/images/spots/jiufen.jpg",
    },
    {
      id: 2,
      name: "十分瀑布",
      estimatedTime: "30 分鐘",
      image: "/images/spots/shifen.jpg",
    },
    {
      id: 3,
      name: "象山登頂",
      estimatedTime: "1.5 小時",
      image: "/images/spots/elephant.jpg",
    },
    {
      id: 4,
      name: "陽明山",
      estimatedTime: "2 小時",
      image: "/images/spots/yangmingshan.jpg",
    },
    {
      id: 5,
      name: "貓空纜車",
      estimatedTime: "1.5 小時",
      image: "/images/spots/maokong.jpg",
    },
  ]);

  const [days, setDays] = useState(1);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleFavorite = (id) => {
    setSpots((prev) => {
      const exists = prev.find((s) => s.id === id);
      if (exists) {
        return prev.filter((s) => s.id !== id);
      } else {
        const addBack = allSpots.find((s) => s.id === id);
        return [...prev, addBack];
      }
    });
  };

  const handlePlan = () => {
    setLoading(true);
    setTimeout(() => {
      // 模擬完成規劃，跳轉到行程紀錄頁並帶入假資料（可後續改為從 Supabase or localStorage 取得）
      router.push("/account?tab=itineraries");
    }, 2000);
  };

  return (
    <section className="min-h-screen bg-zinc-100 py-24">
      <div className="mx-auto w-full max-w-xl px-4">
        <div className="mb-6">
          <h1 className="text-xl font-medium text-black">我的景點清單</h1>
          <p className="text-zinc-400">點選可移除，或從下方加入。</p>
        </div>

        <div className="w-full space-y-3">
          <AnimatePresence>
            {spots.map((spot) => (
              <SpotCard
                key={spot.id}
                {...spot}
                isSelected={true}
                toggleFavorite={toggleFavorite}
              />
            ))}
          </AnimatePresence>
        </div>

        {spots.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-zinc-600">
                選擇出發日期：
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded border border-zinc-300 px-3 py-2 text-sm"
              />
              <label className="text-sm font-medium text-zinc-600">
                行程天數：
              </label>
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="rounded border border-zinc-300 px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>{`${d} 天`}</option>
                ))}
              </select>
            </div>
            <div className="text-center">
              <button
                onClick={handlePlan}
                className="inline-block rounded bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                {loading ? "ChatGPT 排程中..." : "立即規劃行程"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-lg font-medium text-black mb-4">
            可加入的景點總表
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allSpots.map((spot) => (
              <CardSpot
                key={spot.id}
                {...spot}
                isSelected={!!spots.find((s) => s.id === spot.id)}
                toggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const SpotCard = ({ id, name, estimatedTime, isSelected, toggleFavorite }) => {
  const [isPresent, safeToRemove] = usePresence();
  const [scope, animate] = useAnimate();

  useEffect(() => {
    if (!isPresent) {
      const exit = async () => {
        await animate(scope.current, { opacity: 0, x: -30 });
        safeToRemove();
      };
      exit();
    }
  }, [isPresent]);

  return (
    <motion.div
      ref={scope}
      layout
      onClick={() => toggleFavorite(id)}
      className={`relative flex w-full items-center gap-3 rounded border p-3 cursor-pointer transition-colors ${
        isSelected
          ? "bg-white border-zinc-300"
          : "bg-zinc-200 border-zinc-400 hover:bg-zinc-300"
      }`}
    >
      <div className="size-4 rounded-full bg-yellow-400" />
      <p
        className={`text-black ${!isSelected && "text-zinc-500 line-through"}`}
      >
        {name}
      </p>
      <div className="ml-auto text-xs text-zinc-500">{estimatedTime}</div>
    </motion.div>
  );
};

const CardSpot = ({ id, name, image, isSelected, toggleFavorite }) => {
  return (
    <div
      onClick={() => toggleFavorite(id)}
      className={`overflow-hidden rounded-lg shadow transition-all duration-300 cursor-pointer border ${
        isSelected
          ? "bg-white border-zinc-300"
          : "bg-zinc-100 border-zinc-300 hover:bg-zinc-200"
      }`}
    >
      <img src={image} alt={name} className="h-40 w-full object-cover" />
      <div className="p-4">
        <h3 className="text-base font-medium text-zinc-800">{name}</h3>
      </div>
    </div>
  );
};
