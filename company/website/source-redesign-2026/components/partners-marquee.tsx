// Official marks, downloaded from each owner's own domain into
// /public/parteneri (never from third-party logo aggregators, which serve
// outdated or incorrect versions):
//
//   knx.svg     www.knx.org/themes/custom/knx/logo.svg          (vector)
//   mbus.svg    m-bus.com/assets/downloads/MBusLogo240.svg      (vector)
//   bacnet.png  bacnet.org  ASHRAE-BACnet-Logo-New.png          2320x472
//   dali.png    dali-alliance.org  dali_r_logo_black.png        1414x465
//   modbus.png  modbus.org  main_logo.png                       500x200
//   sauter.png  sauter-controls.com  Sauter-controls-logo-EN    178x44
//
// The marks are shown unaltered and are never recoloured or cropped; only the
// rendered box size differs, to even out their very different aspect ratios.
//
// LonMark is deliberately absent: it is a certification mark, so showing it
// would assert a certification Sovitech does not hold. SAUTER is kept in its
// own block because it is a real commercial partnership, which the protocol
// marks are not.

const protocols = [
  { src: "/parteneri/knx.svg", name: "KNX", box: "h-11 max-w-[110px]" },
  { src: "/parteneri/bacnet.png", name: "BACnet", box: "h-8 max-w-[160px]" },
  { src: "/parteneri/modbus.png", name: "Modbus", box: "h-12 max-w-[150px]" },
  { src: "/parteneri/mbus.svg", name: "M-Bus", box: "h-9 max-w-[150px]" },
  { src: "/parteneri/dali.png", name: "DALI", box: "h-9 max-w-[140px]" },
]

export function PartnersMarquee() {
  // duplicated so the -50% translate loops seamlessly
  const loop = [...protocols, ...protocols]

  return (
    <section className="section-s bg-white overflow-hidden">
      <div className="[mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
        <div className="flex w-max animate-marquee">
          {loop.map((p, i) => (
            <div key={i} className="mr-20 shrink-0 h-20 flex items-center justify-center">
              <img
                src={p.src}
                alt={p.name}
                loading="lazy"
                className={`w-auto object-contain ${p.box}`}
              />
            </div>
          ))}
        </div>
      </div>

    </section>
  )
}
