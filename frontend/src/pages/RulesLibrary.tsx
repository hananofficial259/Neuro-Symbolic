import React from 'react';
import { ShieldCheck, CheckCircle2, Terminal, Code2, AlertCircle } from 'lucide-react';

export const RulesLibrary: React.FC = () => {
  const rules = [
    {
      id: 'RULE_PAY_NON_NEGATIVE',
      category: 'Financial Invariants',
      name: 'Non-Negative Account Balance & Debit Ceiling',
      status: 'Active (Z3 Verified)',
      description: 'Guarantees that debiting an account never produces a negative balance unless overdraft is explicitly authorized, and ensures transactions do not exceed the configured limit.',
      formula: '∀ debit, bal_before : (debit > 0 ∧ debit ≤ max_limit) ⟹ (bal_before - debit ≥ 0)',
      variables: ['bal_before: Real', 'debit: Real', 'max_limit: Real'],
    },
    {
      id: 'RULE_DISCOUNT_BOUNDS',
      category: 'Pricing Invariants',
      name: 'Discount Boundary & Subtotal Integrity',
      status: 'Active (Z3 Verified)',
      description: 'Proves that discount percentages are clamped between 0% and maximum allowable threshold (70%), guaranteeing that final calculated price is non-negative and subtotal cannot inflate.',
      formula: '∀ disc_pct, subtotal : (subtotal > 0 ∧ 0 ≤ disc_pct ≤ 70) ⟹ (subtotal - (subtotal * disc_pct / 100) ≥ 0)',
      variables: ['subtotal: Real', 'disc_pct: Real', 'final_price: Real'],
    },
    {
      id: 'RULE_ORDER_STATE_MACHINE',
      category: 'State Machine Invariants',
      name: 'Order Lifecycle State Transition Safety',
      status: 'Active (Z3 Verified)',
      description: 'Prohibits illegal state transitions in order lifecycles (e.g. attempting to ship a refunded order or fulfill a cancelled order).',
      formula: 'transition(from, to) ∈ { (CREATED, PAID), (PAID, SHIPPED), (PAID, REFUNDED) } ∧ ¬(REFUNDED → SHIPPED)',
      variables: ['from_state: Enum', 'to_state: Enum'],
    },
    {
      id: 'RULE_TENANT_ISOLATION',
      category: 'Security Invariants',
      name: 'Multi-Tenant Authorization & Boundary Invariant',
      status: 'Active (Z3 Verified)',
      description: 'Ensures strict tenant separation: cross-tenant access to database records is mathematically disallowed unless explicit platform administrator role is proven.',
      formula: 'authorized(req_tenant, res_tenant, is_admin) ⟺ (req_tenant = res_tenant ∨ is_admin = True)',
      variables: ['req_tenant: String', 'res_tenant: String', 'is_admin: Bool'],
    },
    {
      id: 'RULE_COMMAND_INJECTION',
      category: 'Static AST Invariants',
      name: 'Dangerous Execution Sink Elimination',
      status: 'Active (Semgrep AST)',
      description: 'Detects and flags direct invocations of os.system() and subprocess with shell=True, preventing arbitrary command injection vectors.',
      formula: 'AST_Pattern: Call(func=Attribute(value=Name(id="os"), attr="system"))',
      variables: ['AST Node: Call', 'Sink: os.system'],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-subtle rounded-xl p-6 shadow-xs">
        <div className="flex items-center space-x-2 text-xs font-semibold text-brand uppercase tracking-wider mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Formal Specification Library</span>
        </div>
        <h2 className="text-xl font-bold text-main">Supported Formal Invariant Templates</h2>
        <p className="text-sm text-muted mt-1 max-w-2xl leading-relaxed">
          Rather than relying on ungrounded AI confidence, the foundry verifies code logic against mathematically specified first-order invariants using the Z3 SMT solver and Semgrep AST patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-surface border border-subtle rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-medium text-brand bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                  {rule.category}
                </span>
                <span className="text-xs font-semibold text-pass flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{rule.status}</span>
                </span>
              </div>

              <h3 className="text-base font-bold text-main mb-1.5">{rule.name}</h3>
              <p className="text-xs text-muted leading-relaxed mb-4">{rule.description}</p>

              {/* SMT Formula */}
              <div className="bg-terminal-bg text-terminal-text rounded-md p-3 font-mono text-xs mb-3 shadow-inner">
                <div className="text-muted text-[10px] mb-1">// Mathematical SMT Invariant:</div>
                <div className="text-blue-300 overflow-x-auto whitespace-pre">{rule.formula}</div>
              </div>

              {/* Variables */}
              <div className="text-xs text-muted space-y-1">
                <span className="font-semibold text-main">Model Variables:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {rule.variables.map((v, i) => (
                    <span key={i} className="font-mono bg-canvas border border-subtle px-2 py-0.5 rounded text-[11px]">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-subtle flex items-center justify-between text-xs text-muted">
              <span>Rule ID: <code className="font-mono">{rule.id}</code></span>
              <span className="text-pass font-medium">Deterministic Proof</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
