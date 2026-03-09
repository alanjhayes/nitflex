"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface ModalState {
  id: number;
  mediaType: "movie" | "tv";
}

interface MovieModalContextType {
  modalState: ModalState | null;
  openModal: (id: number, mediaType: "movie" | "tv") => void;
  closeModal: () => void;
}

const MovieModalContext = createContext<MovieModalContextType | null>(null);

export function MovieModalProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<ModalState | null>(null);

  const openModal = useCallback((id: number, mediaType: "movie" | "tv") => {
    setModalState({ id, mediaType });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(null);
  }, []);

  return (
    <MovieModalContext.Provider value={{ modalState, openModal, closeModal }}>
      {children}
    </MovieModalContext.Provider>
  );
}

export function useMovieModal() {
  const ctx = useContext(MovieModalContext);
  if (!ctx) throw new Error("useMovieModal must be used within MovieModalProvider");
  return ctx;
}
