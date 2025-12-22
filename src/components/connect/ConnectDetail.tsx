/**
 * ConnectDetail
 *
 * Restored route component for `/connect/:id` used by `AppRoutes`.
 * The refactor moved most Connect UI under `pages/connect/*` but left this route
 * pointing at a removed component.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { SocialGroup } from "@/types";
import { SocialStorage } from "@/services/storage/social";
import GroupDetailView from "@/pages/connect/GroupDetailView";

export type ConnectDetailProps = {};

export function ConnectDetail(_props: ConnectDetailProps) {
  const navigate = useNavigate();
  const params = useParams();
  const groupId = useMemo(() => params.id ?? "", [params.id]);

  const [group, setGroup] = useState<SocialGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const groups = await SocialStorage.getSocialGroups();
        const found = groups.find((g) => g.id === groupId) ?? null;
        if (!cancelled) setGroup(found);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (groupId) load();
    else setLoading(false);

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-sm font-bold opacity-80">Loading…</div>
      </div>
    );
  }

  if (!groupId || !group) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-lg font-extrabold">Group not found</div>
        <button
          type="button"
          className="rounded-full bg-white/10 px-5 py-2 text-sm font-bold hover:bg-white/15"
          onClick={() => navigate("/connect")}
        >
          Back to Connect
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <GroupDetailView
        group={group}
        onBack={() => navigate("/connect")}
        onJoinToggle={() => {
          // Join/leave handling lives in the Connect feed flow; keep this route read-only for now.
        }}
      />
    </div>
  );
}

export default ConnectDetail;


