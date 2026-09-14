const state = { mode: "melee" };

const els = {
  modeBtns: document.querySelectorAll(".mode-btn"),
  attackLabel: document.querySelector(".attack-stat-label"),
  attackStat: document.getElementById("attackStat"),
  defenseStat: document.getElementById("defenseStat"),
  groups: {
    melee: document.getElementById("melee-modifiers"),
    shooting: document.getElementById("shooting-modifiers"),
    artillery: document.getElementById("artillery-modifiers"),
  },
  meleeFlankRear: document.getElementById("melee-flankrear"),
  meleeRear: document.getElementById("melee-rear"),
  meleeFlank: document.getElementById("melee-flank"),
  meleeRanksRow: document.getElementById("meleeRanksRow"),
  meleeRanksStatus: document.getElementById("meleeRanksStatus"),
  tnDisplay: document.getElementById("tnDisplay"),
  tnBreakdown: document.getElementById("tnBreakdown"),
  tnAlert: document.getElementById("tnAlert"),
  tier1: document.getElementById("tier1"),
  tier2: document.getElementById("tier2"),
  tier3: document.getElementById("tier3"),
  diceCard: document.getElementById("artillery-dice-card"),
  diceDisplay: document.getElementById("diceDisplay"),
  diceBreakdown: document.getElementById("diceBreakdown"),
  artilleryTargetRanks: document.getElementById("artilleryTargetRanks"),
  artilleryDiceFlank: document.getElementById("artillery-dice-flank"),
  artilleryUnitOfOne: document.getElementById("artillery-unitofone"),
};

const DIE_MIN = 1;
const DIE_MAX = 10;

const MODE_CONFIG = {
  melee: { statLabel: "Fight", ranksId: "meleeRanks", otherId: "meleeOther" },
  shooting: { statLabel: "Shoot", ranksId: "shootRanks", otherId: "shootOther" },
  artillery: { statLabel: "Shoot", ranksId: null, otherId: "artilleryOther" },
};

els.modeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    state.mode = btn.dataset.mode;
    els.modeBtns.forEach(b => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-selected", b === btn ? "true" : "false");
    });
    els.attackLabel.textContent = MODE_CONFIG[state.mode].statLabel;
    Object.entries(els.groups).forEach(([mode, group]) => {
      group.classList.toggle("hidden", mode !== state.mode);
    });
    els.diceCard.classList.toggle("hidden", state.mode !== "artillery");
    calculate();
  });
});

document.querySelectorAll("input").forEach(input => {
  input.addEventListener("input", calculate);
  input.addEventListener("change", calculate);
});

document.querySelectorAll(".step-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const step = Number(btn.dataset.step);
    const next = (Number(input.value) || 0) + step;
    input.value = input.min === "" ? next : Math.max(Number(input.min), next);
    calculate();
  });
});

function calculate() {
  const attackStat = Number(els.attackStat.value) || 0;
  const defenseStat = Number(els.defenseStat.value) || 0;
  const config = MODE_CONFIG[state.mode];

  let modifierTotal = 0;
  let parts = [];

  const rankBonusCancelled = state.mode === "melee" && (els.meleeRear.checked || els.meleeFlank.checked);
  const ranks = config.ranksId ? Number(document.getElementById(config.ranksId).value) || 0 : 0;
  if (ranks > 0 && !rankBonusCancelled) {
    modifierTotal += -1 * ranks;
    parts.push(`ranks -${ranks}`);
  }

  if (state.mode === "melee") {
    els.meleeRanksRow.classList.toggle("inactive", rankBonusCancelled);
    els.meleeRanksStatus.textContent = rankBonusCancelled ? "(not applied — your unit is being attacked at its flank/rear)" : "";
    els.meleeRanksRow.querySelectorAll("input, button").forEach(el => {
      el.disabled = rankBonusCancelled;
    });
  }

  const other = Number(document.getElementById(config.otherId).value) || 0;
  if (other !== 0) {
    modifierTotal += other;
    parts.push(`other ${other > 0 ? "+" : ""}${other}`);
  }

  document.querySelectorAll(`[data-group="${state.mode}"]`).forEach(cb => {
    if (!cb.checked) return;
    const mod = Number(cb.dataset.mod);
    modifierTotal += mod;
    if (mod === 0) return;
    const sign = mod > 0 ? "+" : "";
    parts.push(`${sign}${mod}`);
  });

  const tn = defenseStat - attackStat + modifierTotal;

  els.tnDisplay.textContent = tn;
  els.tnBreakdown.textContent = parts.length
    ? `Defense ${defenseStat} − ${config.statLabel} ${attackStat}, ${parts.join(", ")}`
    : `Defense ${defenseStat} − ${config.statLabel} ${attackStat}`;

  if (tn > DIE_MAX) {
    els.tnAlert.textContent = `Target Number over ${DIE_MAX} — per the rulebook, only a natural ${DIE_MAX} has a chance to hit. Reroll it; an 8 or higher on the reroll scores 1 hit. This stays the same whether the TN is 11, 19, or higher — no bonus hit tiers apply.`;
    els.tnAlert.className = "tn-alert tn-alert-special";
    setSpecialTier(els.tier1);
    setImpossibleTier(els.tier2);
    setImpossibleTier(els.tier3);
  } else {
    if (tn <= DIE_MIN) {
      els.tnAlert.textContent = `Guaranteed hit — even the lowest roll (${DIE_MIN}) meets this Target Number.`;
      els.tnAlert.className = "tn-alert tn-alert-auto";
    } else {
      els.tnAlert.className = "tn-alert hidden";
    }
    setTier(els.tier1, tn);
    setTier(els.tier2, tn + 5);
    setTier(els.tier3, tn + 10);
  }

  if (state.mode === "artillery") calculateDice();
}

const DICE_MAX = 5;

function calculateDice() {
  const ranks = Math.max(1, Number(els.artilleryTargetRanks.value) || 1);
  const size = document.querySelector('input[name="artillerySize"]:checked').value;
  const unitOfOne = els.artilleryUnitOfOne.checked;
  const flank = els.artilleryDiceFlank.checked && !unitOfOne;

  let dice = ranks + 1;
  let parts = [`${ranks} rank${ranks !== 1 ? "s" : ""}`, "artillery bonus +1"];

  if (size === "large") {
    dice += 1;
    parts.push("Large +1");
  } else if (size === "enormous") {
    dice += 2;
    parts.push("Enormous +2");
  }

  if (flank) {
    dice += 2;
    parts.push("flank/rear +2");
  }

  const capped = Math.min(dice, DICE_MAX);
  els.diceDisplay.textContent = capped;
  els.diceBreakdown.textContent = dice > DICE_MAX
    ? `${parts.join(", ")} — capped at ${DICE_MAX} (raw total ${dice})`
    : parts.join(", ");
}

function setTier(el, threshold) {
  const row = el.closest(".hit-tier");
  row.classList.remove("impossible", "guaranteed", "special");
  if (threshold > DIE_MAX) {
    setImpossibleTier(el);
  } else if (threshold <= DIE_MIN) {
    el.textContent = "Any roll";
    row.classList.add("guaranteed");
  } else {
    el.textContent = `≥ ${threshold}`;
  }
}

function setSpecialTier(el) {
  const row = el.closest(".hit-tier");
  row.classList.remove("impossible", "guaranteed");
  row.classList.add("special");
  el.textContent = `Nat ${DIE_MAX}, reroll 8+`;
}

function setImpossibleTier(el) {
  const row = el.closest(".hit-tier");
  row.classList.remove("guaranteed", "special");
  row.classList.add("impossible");
  el.textContent = "Not possible";
}

calculate();
