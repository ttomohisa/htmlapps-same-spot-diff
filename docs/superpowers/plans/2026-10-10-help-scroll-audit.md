# Help background-scroll audit

## Confirmed cause and approved scope

Native outside-backdrop wheel scrolls the page while Help stays open. Existing short and narrow Help content, fixed Close, title/version and dismissal/focus pass. Add only a Help-modal root/body overflow lock. Preserve all other UI and engine behavior.

## Execution and gates

1. Add CSS and bilingual Help contracts; observe baseline failures.
2. Add the scoped rule, patch version and synchronized documentation.
3. Regenerate guarded readable/root/self-extract artifacts; run all suites.
4. Obtain independent source review, publish a Draft PR and verify exact-head Windows CI and artifact parity.
5. Verify affected desktop/short/narrow JA/EN Help wheel, keyboard, close/reopen/focus and scroll restoration in the native preview.

Full file workflows, generated output contents and physical-device behavior remain pending. The PR must stay Draft until those gates are completed. CSS contracts are not native geometry evidence.
