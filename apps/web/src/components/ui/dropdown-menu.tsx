function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export const menuButtonClassName =
  'relative flex cursor-pointer items-center rounded-md pr-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500';

export const dropdownMenuItemsClassName =
  'z-50 w-40 origin-top-right rounded-md bg-gray-800 py-2 outline-1 -outline-offset-1 outline-white/10 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in';

export function dropdownMenuItemRowClassName(focus: boolean): string {
  return classNames(
    focus ? 'bg-white/5' : '',
    'block w-full cursor-pointer px-3 py-1 text-left text-sm/6 text-white',
  );
}

export function dropdownMenuItemLinkClassName(focus: boolean): string {
  return classNames(
    focus ? 'bg-white/5' : '',
    'block px-3 py-1 text-sm/6 text-white',
  );
}
