import Maths, { Vec3, Quat, Mat4 }	from "../Maths.js";
import { Components }				from "../ECS.js";

class Move{
	constructor(){
		this.force = 15;                            // Сила, действующая при нажатии клавиши. Масса камеры равна 1, поэтому Force = Acceleration      

		this.velocity      = new Vec3(0,0,0);   // Вектор скорости в базисе forward, right, up
		this.acceleration  = new Vec3(0,0,0);	// Вектор ускорения в базисе forward, right, up
		this.resistance    = new Vec3(0,0,0);	// Вектор силы сопротивления в базисе forward, right, up


		this.epsilon = 0.01;                        // При скоростях, меньших данного значения, считать её нулевой, если силы не действуют

		this.resistCoeff = 2.0;                     // Коэффициент сопротивления. В нашем случае сопротивление пропорционально скорости
	}

} Components(Move);

export default Move;