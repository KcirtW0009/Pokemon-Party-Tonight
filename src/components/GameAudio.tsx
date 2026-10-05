'use client';
import {useEffect,useRef} from 'react';
import type {RoomView} from '@/lib/types';
import {gameSound} from '@/lib/gameSounds';
import {playPartySound} from '@/lib/partyAudio';
export function GameAudio({view}:{view:RoomView}){const previous=useRef<RoomView|null>(null);useEffect(()=>{const sound=gameSound(previous.current,view);previous.current=view;if(sound&&!document.hidden)playPartySound(sound);},[view]);return null;}
