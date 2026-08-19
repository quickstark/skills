function exactSame(left = [], right = []) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function result(completionState, evidence, allowedMutations = []) {
  return { completionState, evidence, allowedMutations };
}

export function runPsSafetyScenario(scenario) {
  const input = scenario.input ?? {};

  switch (scenario.kind) {
    case "blast-radius":
      return input.executableProof
        ? result("complete", "critical safety claim directly proven")
        : result("complete", "critical safety claim remains unproven");

    case "forensics": {
      const evidence = String(input.evidence ?? "");
      return input.repairNeeded
        ? result("continuation-required", evidence)
        : result("complete", evidence);
    }

    case "verification": {
      if (!input.harnessAvailable) return result("input-required", "real verification harness is required");
      const allowedRoots = input.allowedRoots ?? [];
      const invalid = (input.changedFiles ?? []).filter(
        (path) => !allowedRoots.some((root) => path === root || path.startsWith(`${root}/`)),
      );
      if (invalid.length > 0) return result("failed", `product-source mutation rejected: ${invalid.join(", ")}`);
      const layout = input.declaredDirectory ?? input.genericDirectory;
      return result("complete", input.drift ? `feature map reconciled in ${layout}` : `verification assets created in ${layout}`, input.changedFiles ?? []);
    }

    case "evaluation": {
      if (input.history?.enabled && (!input.history.selected || input.history.scope !== "selected-run")) {
        return result("failed", "unselected or over-broad history scope rejected");
      }
      const trials = input.trials ?? [];
      const controls = trials.filter((trial) => trial.arm === "control");
      const variants = trials.filter((trial) => trial.arm === "variant");
      if (controls.length === 0 || variants.length === 0) return result("failed", "control and variant must remain isolated");
      const average = (items) => items.reduce((sum, item) => sum + item.score, 0) / items.length;
      return result("complete", JSON.stringify({
        control: average(controls),
        variant: average(variants),
        failedTrials: trials.filter((trial) => trial.failed).map((trial) => trial.id),
        historyUsed: input.history?.enabled === true,
      }));
    }

    case "hillclimb": {
      if (input.baseline === undefined) return result("input-required", "baseline is required");
      if ((input.commands ?? []).some((command) => /\b(?:git push|gh pr create|merge|deploy|release)\b/i.test(command))) {
        return result("failed", "publication command rejected");
      }
      if (input.noise !== undefined && Math.abs(input.measurement - input.baseline) <= input.noise) {
        return result("continuation-required", "measurement is within the declared noise floor");
      }
      if (input.measurement < input.baseline) return result("complete", "regression measured; rollback required", ["rollback"]);
      if (input.budgetRemaining === 0 && input.measurement < input.target) {
        return result("complete", "experiment budget exhausted below target");
      }
      return result("complete", "improvement measured and accepted", ["keep"]);
    }

    case "visual": {
      if (input.baselineHash !== input.observedBaselineHash) return result("failed", "baseline hash changed");
      if (input.tolerance === undefined) return result("input-required", "declared tolerance is required");
      if (!input.assetsAvailable) return result("input-required", "required visual assets or fonts are unavailable");
      if (!input.environmentMatches) return result("input-required", "capture environment drifted");
      const evidence = `metric=${input.metric}; tolerance=${input.tolerance}; residual=${input.residual}`;
      return input.residual <= input.tolerance
        ? result("complete", evidence)
        : result("continuation-required", evidence);
    }

    case "pr": {
      if (input.cancelled || input.timedOut) return result("failed", input.cancelled ? "wait cancelled" : "wait timed out");
      const mutating = (input.actions ?? []).filter((action) => action !== "inspect");
      if (input.mode === "inspect-only" && mutating.length > 0) return result("failed", "inspect-only mode rejected mutation");
      if (mutating.some((action) => /merge|auto-merge|deploy|release/i.test(action))) return result("failed", "forbidden PR operation rejected");
      if (input.mode === "authorized-repair" && input.branch !== input.selectedBranch) return result("failed", "repair branch does not match selected PR");
      const allowed = input.mode === "authorized-repair" ? mutating : [];
      return result("complete", "selected PR state resolved", allowed);
    }

    case "cleanup": {
      const scope = input.scope ?? "worktrees";
      if (scope !== "worktrees" && !input.separateSecondaryAuthorization) {
        return result("input-required", "secondary scope requires a separate audit and confirmation");
      }
      if ((input.remove ?? []).length > 0 && !input.auditComplete) return result("failed", "read-only audit must precede removal");
      if (!exactSame(input.remove ?? [], input.confirmedTargets ?? [])) return result("input-required", "confirmation is not bound to the exact target list");
      const candidates = new Map((input.candidates ?? []).map((candidate) => [candidate.path, candidate]));
      for (const path of input.remove ?? []) {
        const candidate = candidates.get(path);
        if (!candidate || !candidate.exact || candidate.dirty || !candidate.merged) {
          return result("failed", "unsafe, dirty, unmerged, or unresolved target rejected");
        }
      }
      return result("complete", `removed=${(input.remove ?? []).join(",") || "none"}; scope=${scope}`, input.remove ?? []);
    }

    default:
      throw new Error(`Unsupported PS safety scenario kind: ${scenario.kind}`);
  }
}
