/** The paw print stencilled on an empty deployment pad. */
export function PawStencil({ fill = '#FFE49A', ...rest }: { fill?: string } & React.SVGProps<SVGGElement>) {
  return (
    <g fill={fill} {...rest}>
      <ellipse cx={0} cy={3} rx={5.6} ry={4.4} />
      <circle cx={-5.2} cy={-4.4} r={2.2} />
      <circle cx={-1.8} cy={-7.4} r={2.2} />
      <circle cx={1.8} cy={-7.4} r={2.2} />
      <circle cx={5.2} cy={-4.4} r={2.2} />
    </g>
  );
}
