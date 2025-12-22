/**
 * useMerveConfig - State and handlers for Merve configuration
 */
import { useCallback, useMemo } from "react";
import type { MerveConfig, MerveAction, MerveActionType, IngestKind, MerveIntegrationSectionProps } from "../types";
import { DEFAULT_ACTIONS_BY_TYPE, DEFAULT_TEMPLATES } from "../constants";

const createId = () => `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function useMerveConfig({ placeType, value, onChange, lat, lng }: MerveIntegrationSectionProps) {
    const normalizeConfig = useCallback((partial: Partial<MerveConfig>): MerveConfig => ({
        enabled: partial.enabled ?? false,
        actions: partial.actions ?? [],
        whatsappE164: partial.whatsappE164,
        geo: lat && lng ? { lat, lng } : partial.geo,
        coverageAreas: partial.coverageAreas ?? [],
        tags: partial.tags ?? [],
    }), [lat, lng]);

    const config = useMemo(() => normalizeConfig(value), [value, normalizeConfig]);
    const availableActions = useMemo(() => DEFAULT_ACTIONS_BY_TYPE[placeType] || ["inquire"], [placeType]);

    const upsertAction = useCallback((actionType: MerveActionType, updater: (prev: MerveAction | null) => MerveAction | null) => {
        const existing = config.actions.find((a) => a.actionType === actionType);
        const updated = updater(existing || null);
        let newActions: MerveAction[];
        if (!updated) {
            newActions = config.actions.filter((a) => a.actionType !== actionType);
        } else if (existing) {
            newActions = config.actions.map((a) => (a.actionType === actionType ? updated : a));
        } else {
            newActions = [...config.actions, updated];
        }
        onChange({ ...config, actions: newActions });
    }, [config, onChange]);

    const handleToggleEnabled = useCallback(() => {
        onChange({ ...config, enabled: !config.enabled });
    }, [config, onChange]);

    const handleActionToggle = useCallback((actionType: MerveActionType) => {
        const existing = config.actions.find((a) => a.actionType === actionType);
        if (existing) {
            upsertAction(actionType, (prev) => prev ? { ...prev, enabled: !prev.enabled } : null);
        } else {
            upsertAction(actionType, () => ({
                id: createId(),
                actionType,
                enabled: true,
                dispatch: { channel: "whatsapp", template: DEFAULT_TEMPLATES[actionType] || "" },
            }));
        }
    }, [config.actions, upsertAction]);

    const handleActionTemplateChange = useCallback((actionType: MerveActionType, template: string) => {
        upsertAction(actionType, (prev) => prev ? { ...prev, dispatch: { ...prev.dispatch, template } } : null);
    }, [upsertAction]);

    const handleActionWhatsAppChange = useCallback((actionType: MerveActionType, toE164: string) => {
        upsertAction(actionType, (prev) => prev ? { ...prev, dispatch: { ...prev.dispatch, toE164 } } : null);
    }, [upsertAction]);

    const handleActionDataKindChange = useCallback((actionType: MerveActionType, kind: IngestKind | "") => {
        upsertAction(actionType, (prev) => prev ? { ...prev, data: { ...prev.data, kind: kind || undefined } } : null);
    }, [upsertAction]);

    const handleActionDataRequiredChange = useCallback((actionType: MerveActionType, required: boolean) => {
        upsertAction(actionType, (prev) => prev ? { ...prev, data: { ...prev.data, required } } : null);
    }, [upsertAction]);

    const isActionEnabled = useCallback((actionType: MerveActionType) =>
        config.actions.find((a) => a.actionType === actionType)?.enabled ?? false, [config.actions]);

    const getAction = useCallback((actionType: MerveActionType) =>
        config.actions.find((a) => a.actionType === actionType), [config.actions]);

    return {
        config,
        availableActions,
        handleToggleEnabled,
        handleActionToggle,
        handleActionTemplateChange,
        handleActionWhatsAppChange,
        handleActionDataKindChange,
        handleActionDataRequiredChange,
        isActionEnabled,
        getAction,
    };
}
