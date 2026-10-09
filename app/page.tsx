"use client";

import { useEffect, useRef, useState } from "react";
import { openTalk, type SavedOrder } from "@/lib/talk";
import { prepareSound } from "@/lib/voice";

type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
};

const steps = [
  {
    title: "Start talking",
    text: "Press the button and allow the microphone.",
  },
  {
    title: "Say your order",
    text: "Name the food and how many you want.",
  },
  {
    title: "See it written",
    text: "When you are finished, the order opens in a popup.",
  },
];

export default function HomePage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuNote, setMenuNote] = useState("Loading the menu...");
  const [order, setOrder] = useState<SavedOrder | null>(null);
  const [talking, setTalking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const endTalk = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadMenu(setMenu, setMenuNote);

    return () => {
      endTalk.current?.();
    };
  }, []);

  async function onStart() {
    if (busy || talking) {
      return;
    }

    prepareSound();
    setBusy(true);
    setProblem("");
    setOrder(null);

    try {
      endTalk.current = await openTalk({
        onOrder: setOrder,
        onProblem: setProblem,
        onEnd: () => setTalking(false),
      });
      setTalking(true);
    } catch (error) {
      setProblem(startProblem(error));
    } finally {
      setBusy(false);
    }
  }

  function onEnd() {
    endTalk.current?.();
    endTalk.current = null;
    setTalking(false);
  }

  return (
    <main className="min-h-screen bg-[#f4efe8] text-[#241c16]">
      <header className="border-b border-[#e4dcd2]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <p className="text-lg font-semibold">Voice Kitchen</p>
          <p className="text-sm text-[#6d6258]">Order by speaking</p>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-widest text-[#1f6a45]">
          Voice orders
        </p>
        <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
          Speak your order. See it written down.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-[#5c5148]">
          Start a short voice conversation, tell us the food and how many, and
          the finished order opens in a popup.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          {talking ? (
            <button type="button" onClick={onEnd} className={darkButton}>
              End Conversation
            </button>
          ) : (
            <button type="button" onClick={onStart} disabled={busy} className={greenButton}>
              {busy ? "Connecting..." : "Start Conversation"}
            </button>
          )}
          {talking && <p className="text-sm text-[#5c5148]">Listening. Speak your order.</p>}
        </div>

        {problem && <p className="mt-4 text-sm text-[#9b2c2c]">{problem}</p>}
      </section>

      <section className="border-t border-[#e4dcd2] bg-white">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-14 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title}>
              <p className="text-sm font-medium text-[#1f6a45]">0{index + 1}</p>
              <h2 className="mt-2 text-xl font-semibold">{step.title}</h2>
              <p className="mt-2 leading-7 text-[#5c5148]">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="text-2xl font-semibold">What you can order</h2>
        <p className="mt-2 text-[#5c5148]">Prices are added by the server, not by the voice.</p>
        {menuNote && <p className="mt-6 text-[#6d6258]">{menuNote}</p>}
        {menu.length > 0 && <FoodList menu={menu} />}
      </section>

      {order && <OrderPopup order={order} onClose={() => setOrder(null)} />}
    </main>
  );
}

const greenButton =
  "rounded-full bg-[#1f6a45] px-6 py-3 text-base font-medium text-white hover:bg-[#174f34] disabled:opacity-60";

const darkButton =
  "rounded-full bg-[#241c16] px-6 py-3 text-base font-medium text-white hover:bg-[#3a312b]";

async function loadMenu(
  setMenu: (menu: MenuItem[]) => void,
  setMenuNote: (note: string) => void,
) {
  try {
    const response = await fetch("/api/menu");
    const body = await response.json();

    if (!response.ok || !body.success) {
      throw new Error("The menu could not be loaded.");
    }

    setMenu(body.data);
    setMenuNote("");
  } catch {
    setMenuNote("The menu could not be loaded. Start the server and refresh.");
  }
}

function startProblem(error: unknown) {
  const micBlocked =
    error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "NotFoundError");

  if (micBlocked) {
    return "Please allow the microphone so we can hear your order.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Could not start the voice line.";
}

function FoodList({ menu }: { menu: MenuItem[] }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {menu.map((item) => (
        <article key={item.id} className="rounded-2xl border border-[#e4dcd2] bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <p className="font-medium text-[#1f6a45]">Rs {item.price}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#6d6258]">{item.description}</p>
        </article>
      ))}
    </div>
  );
}

function OrderPopup({ order, onClose }: { order: SavedOrder; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-title"
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="order-title" className="text-2xl font-semibold">
          Your order
        </h2>
        <p className="mt-2 text-[#5c5148]">Total: Rs {order.totalAmount}</p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-[#241c16] p-4 text-sm leading-6 text-[#f4efe8]">
          {JSON.stringify(order, null, 2)}
        </pre>
        <button type="button" onClick={onClose} className={`mt-5 ${greenButton}`}>
          Close
        </button>
      </div>
    </div>
  );
}
