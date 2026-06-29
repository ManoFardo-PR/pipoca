/**
 * Pipoca — Contrato de Narrativa (CN · eixo 1)
 * ---------------------------------------------
 * LEI DO SEAM: telas e a camada CORE falam APENAS com esta interface.
 * Ninguém importa MotorGrafoAutoral ou MotorIA diretamente.
 * Motor A (grafo) e Motor B (IA) implementam MotorNarrativa de forma
 * intercambiável — nenhuma tela precisa mudar ao trocar de motor.
 */

export type { Nivel, ModoDesfecho, Trecho, MotorNarrativa } from "../core/grafo/tipos.js";
