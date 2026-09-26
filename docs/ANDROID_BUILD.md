# Android Build Plan

## Performance targets
- Baseline: 30 FPS on supported mid-range Android devices.
- High quality target: 60 FPS on capable devices.
- Dynamic resolution and scalability are preferred over a fixed resolution.

## Optimization
- World streaming and HLOD.
- Aggressive mesh LODs and occlusion culling.
- Instanced foliage and hierarchical culling.
- Async loading and soft references.
- Selective physics sub-stepping.
- Profile with Unreal Insights and Android GPU/frame profiling tools.

## Quality tiers
Low / Medium / High / Ultra presets control shadows, foliage, effects, reflections and resolution.
