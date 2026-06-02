import { classifyFiscalMonitoringDocument, parseFiscalInutilizacaoPayload, processFiscalPollingBatch } from "../../src/services/fiscal.service";

describe("fiscal monitoring", () => {
  const now = new Date("2026-05-31T12:00:00.000Z");

  it("warns about a transmission pending beyond the warning threshold", () => {
    const alert = classifyFiscalMonitoringDocument({
      id: 1,
      modelo: "NFCE",
      status: "ENVIADO",
      numero: 10,
      serie: 1,
      createdAt: "2026-05-31T11:40:00.000Z",
    }, now);

    expect(alert).toEqual(expect.objectContaining({
      severity: "warning",
      code: "TRANSMISSAO_PENDENTE",
      ageMinutes: 20,
    }));
  });

  it("marks an old pending transmission as critical", () => {
    const alert = classifyFiscalMonitoringDocument({
      id: 2,
      modelo: "NFE",
      status: "PRONTO_PARA_ENVIO",
      numero: 11,
      serie: 1,
      createdAt: "2026-05-31T10:30:00.000Z",
    }, now);

    expect(alert).toEqual(expect.objectContaining({
      severity: "critical",
      code: "TRANSMISSAO_PENDENTE",
      ageMinutes: 90,
    }));
  });

  it("marks contingency documents beyond the configured window as critical", () => {
    const alert = classifyFiscalMonitoringDocument({
      id: 3,
      modelo: "NFCE",
      status: "CONTINGENCIA",
      numero: 12,
      serie: 1,
      createdAt: "2026-05-30T10:00:00.000Z",
      emitidaEm: "2026-05-30T10:00:00.000Z",
    }, now);

    expect(alert).toEqual(expect.objectContaining({
      severity: "critical",
      code: "CONTINGENCIA_PRAZO_EXCEDIDO",
      remainingMinutes: 0,
    }));
  });

  it("ignores recently authorized documents", () => {
    expect(classifyFiscalMonitoringDocument({
      id: 4,
      modelo: "NFCE",
      status: "AUTORIZADA",
      numero: 13,
      serie: 1,
      createdAt: "2026-05-31T11:00:00.000Z",
    }, now)).toBeNull();
  });

  it("continues polling when one provider consultation fails", async () => {
    const consult = jest.fn()
      .mockResolvedValueOnce({ status: "AUTORIZADA" })
      .mockRejectedValueOnce(new Error("provider indisponivel"))
      .mockResolvedValueOnce({ status: "AUTORIZADA" });

    const results = await processFiscalPollingBatch([
      { id: 1, empresaId: 10, modelo: "NFCE", status: "ENVIADO" },
      { id: 2, empresaId: 10, modelo: "NFCE", status: "ENVIADO" },
      { id: 3, empresaId: 20, modelo: "NFE", status: "ENVIADO" },
    ], consult);

    expect(consult).toHaveBeenCalledTimes(3);
    expect(results).toEqual([
      { id: 1, empresaId: 10, success: true },
      { id: 2, empresaId: 10, success: false, error: "provider indisponivel" },
      { id: 3, empresaId: 20, success: true },
    ]);
  });

  it("reads the numbering range from an inutilizacao event safely", () => {
    expect(parseFiscalInutilizacaoPayload(JSON.stringify({
      modelo: "NFCE",
      serie: 2,
      numeroInicial: 100,
      numeroFinal: 105,
      ambiente: "HOMOLOGACAO",
    }))).toEqual({
      modelo: "NFCE",
      serie: 2,
      numeroInicial: 100,
      numeroFinal: 105,
      ambiente: "HOMOLOGACAO",
    });
    expect(parseFiscalInutilizacaoPayload("{invalid")).toBeNull();
  });
});
