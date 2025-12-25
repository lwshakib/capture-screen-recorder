import { cn } from "@/lib/utils"

type LogoIconProps = {
  className?: string
  color?: string
}

export const Logo = ({className, color}: LogoIconProps) => {
  return (
    <div className="flex items-center justify-center">
      <LogoIcon className={className} color={color} />
      <span className="ml-2 text-2xl font-bold">Capture</span>
    </div>
  )
}

export const LogoIcon = ({ className, color = "currentColor" }: LogoIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={cn("size-10", className)}
      fill="none"
    >
      <g
        transform="translate(6 0)"
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
      >
        <path d="m35.3721 14v8.0492h-9.9698v-2.2927z" />
        <path
          d="m35.3699 14.0001-9.9698 5.7565-7.3513-4.2436v-11.513z"
          opacity=".9"
        />
        <path
          d="m18.0512 4v11.513l-7.349 4.2436-9.969778-5.7565z"
          opacity=".8"
        />
        <path
          d="m10.7002 19.7565v8.4868l-9.969731 5.756v-19.9993z"
          opacity=".7"
        />
        <path
          d="m18.0492 32.4871v11.5129l-17.318731-10.0006 9.969731-5.756z"
          opacity=".6"
        />
        <path
          d="m35.3699 33.9994-17.3211 10.0006v-11.5129l7.3513-4.2437z"
          opacity=".5"
        />
        <path
          d="m35.3721 25.9507v8.0487l-9.9698-5.756v-2.2927z"
          opacity=".4"
        />
      </g>
    </svg>
  )
}
