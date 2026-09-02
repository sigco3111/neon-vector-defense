import { useEffect, useState } from 'react';
import { loadEntitlements, purchaseEntitlement, subscribeEntitlements } from '../game/entitlements';
import { MAP_THEME_PACKS, ownsMapThemePack, type MapThemePack } from '../game/mapThemes';
import { meta } from '../game/meta';

export interface MapThemePickerProps { onChange?: (theme: MapThemePack) => void }

/** Cosmetic picker intended for the sector/map selection surface. */
export function MapThemePicker({ onChange }: MapThemePickerProps) {
  const [equipped, setEquipped] = useState(meta.equippedMapTheme);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [, rerender] = useState(0);
  useEffect(() => {
    const unsubscribe = subscribeEntitlements(() => rerender((value) => value + 1));
    void loadEntitlements();
    return unsubscribe;
  }, []);
  const choose = async (pack: MapThemePack) => {
    const cosmeticId = `map-theme-${pack.id}`;
    const owned = ownsMapThemePack(pack);
    if (!owned) {
      setPurchasing(pack.id);
      try {
        const granted = await purchaseEntitlement(cosmeticId);
        meta.recordServerEntitlement(cosmeticId, granted.salvageBalance);
      } catch (error) {
        console.warn('Map theme purchase failed', error);
        return;
      } finally {
        setPurchasing(null);
      }
    }
    meta.equip('map-theme', pack.id);
    setEquipped(pack.id);
    onChange?.(pack);
  };

  return (
    <div aria-label="맵 테마" role="group" data-testid="map-theme-picker" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {MAP_THEME_PACKS.map((pack) => {
        const owned = ownsMapThemePack(pack);
        const afford = meta.salvage >= pack.cost;
        const active = equipped === pack.id;
        const label = owned ? `${pack.name} 맵 테마 장착` : afford ? `${pack.name} 맵 테마 구매 (인양물 ${pack.cost})` : `${pack.name} - 인양물 ${pack.cost - meta.salvage}개 더 필요`;
        return (
          <button key={pack.id} type="button" aria-label={label} aria-pressed={active} disabled={purchasing !== null || (!owned && !afford)}
            onClick={() => void choose(pack)} data-testid={`map-theme-${pack.id}`}
            style={{ borderColor: active ? 'var(--accent)' : pack.palette?.pathEdge, opacity: !owned && !afford ? 0.45 : 1 }}>
            <span aria-hidden="true" style={{ display: 'inline-block', width: 12, height: 12, marginRight: 6, borderRadius: 2, background: pack.palette?.pathEdge ?? 'var(--accent)' }} />
            {pack.name}{!owned && ` · ${pack.cost}`}
          </button>
        );
      })}
    </div>
  );
}

export default MapThemePicker;
