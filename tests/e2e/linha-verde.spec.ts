import { test, expect } from "@playwright/test";

/**
 * e2e da linha verde — Marco 1 (convergência runtime → src/).
 * Prova que o app que roda (index.html) consome o SEAM CANÔNICO (MotorNarrativa /
 * ValidadorOrdem via fábrica), não mais os stubs inline; e que a narrativa T2→T7
 * sai do grafo. Roda em chromium sobre o PWA estático (server.js).
 */

type Win = typeof window & {
  PipocaCanonico?: unknown;
  PipocaApp?: any;
  PipocaRoteador?: { irParaTela(n: number): void };
};

test.describe("linha verde · convergência", () => {
  test("o app usa o seam canônico (bundle + motor/validador da fábrica)", async ({ page }) => {
    const erros: string[] = [];
    page.on("pageerror", (e) => erros.push(String(e)));
    await page.goto("/");
    await page.waitForFunction(
      () => {
        const w = window as Win;
        return !!w.PipocaCanonico && !!w.PipocaApp && !!w.PipocaApp.motor && !!w.PipocaApp.ordem;
      },
      undefined,
      { timeout: 15_000 }
    );

    const r = await page.evaluate(() => {
      const w = window as Win;
      const motor = w.PipocaApp.motor;
      const ordem = w.PipocaApp.ordem;
      return {
        temCanon: !!w.PipocaCanonico,
        temDesfecho: typeof motor.desfecho === "function", // o stub inline NÃO tinha desfecho
        aberturaN3: motor.abertura("n3").texto as string,
        frascoRule: motor.aoAdicionarObjeto(["vagalume"], "frasco", "n3").texto as string,
        validarParcial: ordem.validar(["vagalume", "frasco"]).ok as boolean,
        validarForaDeOrdem: ordem.validar(["frasco", "vagalume"]).ok as boolean,
        desfechoConv: motor.desfecho(["vagalume", "frasco", "vento"], "convergente", "n3").texto as string,
      };
    });

    expect(r.temCanon).toBe(true);
    expect(r.temDesfecho).toBe(true); // prova decisiva: motor veio da fábrica canônica
    expect(r.aberturaN3).toContain("Quando a noite chegou");
    expect(r.frascoRule).toContain("casinha de vidro"); // regra tem:vagalume avaliada pelo motor
    expect(r.validarParcial).toBe(true); // ValidadorOrdem aceita ordem parcial consistente (00-18)
    expect(r.validarForaDeOrdem).toBe(false);
    expect(r.desfechoConv).toContain("acendeu a noite toda");
    expect(erros).toEqual([]);
  });

  test("playthrough da narrativa pelo seam (abertura → 3 objetos → desfecho)", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => {
      const w = window as Win;
      return !!w.PipocaApp && !!w.PipocaApp.motor && !!w.PipocaApp.ordem;
    });

    const linhas: string[] = await page.evaluate(() => {
      const w = window as Win;
      const motor = w.PipocaApp.motor;
      const ordem = w.PipocaApp.ordem;
      const nivel = "n3";
      const ids: string[] = ordem.ordemCanonica();
      const out: string[] = [motor.abertura(nivel).texto];
      const hist: string[] = [];
      for (const id of ids) {
        out.push(motor.aoAdicionarObjeto(hist, id, nivel).texto);
        hist.push(id);
      }
      out.push(motor.desfecho(hist, "convergente", nivel).texto);
      return out;
    });

    const todo = linhas.join(" ");
    expect(linhas[0]).toContain("Quando a noite chegou");
    expect(todo).toContain("luzinha piscando"); // vagalume (gatilho)
    expect(todo).toContain("casinha de vidro"); // frasco (regra tem:vagalume)
    expect(todo).toContain("vaga-lume estava seguro"); // vento (regra tem:frasco)
    expect(linhas[linhas.length - 1]).toContain("acendeu a noite toda"); // desfecho
    expect(linhas.every((t) => typeof t === "string" && t.length > 0)).toBe(true);
  });

  test("as telas T2–T7 montam sem erro pelo roteador", async ({ page }) => {
    const erros: string[] = [];
    page.on("pageerror", (e) => erros.push(String(e)));
    await page.goto("/");
    await page.waitForFunction(() => !!(window as Win).PipocaApp);

    // estado mínimo para as telas renderizarem
    await page.evaluate(() => {
      const w = window as Win;
      w.PipocaApp.setState({
        perfil: { id: "p1", nome: "Joana", idade: 7, nivel: "n3", avatarId: "pingo" },
        _perfis: [{ id: "p1", nome: "Joana", avatarId: "pingo", nivel: "n3" }],
        historia: { cenarioId: "quintal_anoitecer", objetos: ["vagalume"], aberta: true },
        gateObjId: "vagalume",
        gateTrecho: "Uma luzinha piscando no escuro.",
        gatePalavraIdx: 0,
        gateStage: "reading",
        gateEarned: 3,
      });
    });

    for (const n of [2, 3, 4, 5, 6, 7]) {
      await page.evaluate((tela) => {
        const w = window as Win;
        if (w.PipocaRoteador) w.PipocaRoteador.irParaTela(tela);
        w.PipocaApp.setState({ tela });
      }, n);
      await page.waitForTimeout(120);
      const telaAtual = await page.evaluate(() => (window as Win).PipocaApp.estado.tela);
      expect(telaAtual).toBe(n);
    }
    expect(erros).toEqual([]);
  });
});
