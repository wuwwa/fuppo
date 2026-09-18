import type { ToyContext } from '../toys/types';
import { mountTouchGel } from './touch-scene';
export async function mount(host: HTMLElement, context: ToyContext) { return mountTouchGel(host, context); }
