import { createContext, useContext } from 'react';
import type { DeskProps } from './DeskHeader';

/** What the desktop header needs (the streak, the player's picture, where each place goes), provided once by `StargazerApp`
    so the pages that only wear the header never carry those props. */
export const DeskContext = createContext<DeskProps | null>(null);
export const useDesk = () => useContext(DeskContext);
