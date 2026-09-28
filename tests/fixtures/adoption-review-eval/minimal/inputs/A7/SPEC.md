# Invoice line amount

Synthetic review fixture. Unit price is a finite nonnegative amount; quantity is a nonnegative integer. An omitted or null quantity defaults to one. Quantity zero is valid and its line amount is zero. The selected change adds the null default without changing existing callers. No tracker or real PR is configured.
