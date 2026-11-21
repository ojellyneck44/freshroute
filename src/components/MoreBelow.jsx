import {useEffect, useState} from 'react';
import {ChevronDown} from 'lucide-react';

// On a long screen (drop-off counts, receiving, set-up), a fade and a "More below" button at the bottom
// say there's more to scroll to. It watches whatever is scrolling: a full-screen overlay, or the page.
const scroller = () => {
  const overlays = document.querySelectorAll('.overlay');
  return overlays.length ? overlays[overlays.length - 1] : document.scrollingElement;
};

export default function MoreBelow() {
  const [show, setShow] = useState(false);
  const [tabs, setTabs] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = scroller();
        const onMap = !document.querySelector('.overlay') && document.querySelector('.mapshell'); // overlays (drop-off counts) sit on the map
        const left = el.scrollHeight - el.scrollTop - el.clientHeight;
        setShow(!onMap && el.scrollHeight > el.clientHeight + 80 && left > 80);
        const bar = document.querySelector('.tabbar');
        setTabs(!document.querySelector('.overlay') && !!bar && getComputedStyle(bar).display !== 'none');
      });
    };
    check();
    document.addEventListener('scroll', check, true);
    addEventListener('resize', check);
    const t = setInterval(check, 700); // content can grow without a scroll (counts, banners)
    return () => (document.removeEventListener('scroll', check, true), removeEventListener('resize', check), clearInterval(t), cancelAnimationFrame(raf));
  }, []);
  const go = () => {
    const el = scroller();
    el.scrollBy({top: el.clientHeight * 0.7, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  };
  return (
    <div className={`more-below${show ? ' on' : ''}${tabs ? ' tabs' : ''}`} aria-hidden={!show}>
      <button className="glass dense" onClick={go} tabIndex={show ? 0 : -1}>
        More below <ChevronDown size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
